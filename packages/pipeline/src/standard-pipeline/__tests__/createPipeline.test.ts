import { createHelper } from '../../core/helper.js';
import { createPipeline } from '../createPipeline.js';
import type {
	HelperApplyOptions,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineRunState,
} from '../../core/types.js';
import type {
	Pipeline,
	PipelineExtensionRollbackErrorMetadata,
} from '../types.js';

type TestRunOptions = Record<string, never>;
type TestBuildOptions = Record<string, never>;
type TestDiagnostic = PipelineDiagnostic;
type TestReporter = Required<PipelineReporter> & {
	readonly info: jest.Mock;
	readonly child: jest.Mock<TestReporter, []>;
};
type TestContext = { readonly reporter: TestReporter };
type TestDraft = string[];
type TestArtifact = string[];
type TestRunResult = PipelineRunState<TestArtifact, TestDiagnostic>;
type TestPipeline = Pipeline<
	TestRunOptions,
	TestRunResult,
	TestContext,
	TestReporter,
	TestBuildOptions,
	TestArtifact,
	void,
	string[],
	void,
	string[],
	TestDiagnostic
>;

function createTestReporter(): TestReporter {
	const reporter = {
		warn: jest.fn(),
		info: jest.fn(),
		child: jest.fn(),
	} as unknown as TestReporter;

	reporter.child.mockReturnValue(reporter);

	return reporter;
}

function createTestPipeline(options?: {
	readonly onDiagnostic?: ({
		reporter,
		diagnostic,
	}: {
		readonly reporter: TestReporter;
		readonly diagnostic: TestDiagnostic;
	}) => void;
	readonly onExtensionRollbackError?: ({
		error,
		extensionKeys,
		hookSequence,
		errorMetadata,
		context,
	}: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TestContext;
	}) => void;
}): {
	pipeline: TestPipeline;
	reporter: TestReporter;
} {
	const reporter = createTestReporter();

	const pipeline = createPipeline<
		TestRunOptions,
		TestBuildOptions,
		TestContext,
		TestReporter,
		TestDraft,
		TestArtifact,
		TestDiagnostic,
		TestRunResult,
		void,
		string[],
		void,
		string[]
	>({
		createError(code, message) {
			throw new Error(`[${code}] ${message}`);
		},
		createBuildOptions() {
			return {};
		},
		createContext() {
			return { reporter } satisfies TestContext;
		},
		createFragmentState() {
			return [] as TestDraft;
		},
		createFragmentArgs({ context, draft }) {
			return {
				context,
				input: undefined,
				output: draft,
				reporter: context.reporter,
			} satisfies HelperApplyOptions<
				TestContext,
				void,
				string[],
				TestReporter
			>;
		},
		finalizeFragmentState({ draft }) {
			return draft.slice();
		},
		createBuilderArgs({ context, artifact }) {
			return {
				context,
				input: undefined,
				output: artifact,
				reporter: context.reporter,
			} satisfies HelperApplyOptions<
				TestContext,
				void,
				string[],
				TestReporter
			>;
		},
		createRunResult({ artifact, diagnostics, steps }) {
			return { artifact, diagnostics, steps } satisfies TestRunResult;
		},
		onDiagnostic: options?.onDiagnostic,
		onExtensionRollbackError: options?.onExtensionRollbackError,
	});

	pipeline.ir.use(
		createHelper<
			TestContext,
			void,
			string[],
			TestReporter,
			typeof pipeline.fragmentKind
		>({
			key: 'fragment.core',
			kind: pipeline.fragmentKind,
			apply({ output }) {
				output.push('fragment');
			},
		})
	);

	pipeline.builders.use(
		createHelper<
			TestContext,
			void,
			string[],
			TestReporter,
			typeof pipeline.builderKind
		>({
			key: 'builder.core',
			kind: pipeline.builderKind,
			priority: 0,
			apply({ output }) {
				output.push('builder');
			},
		})
	);

	return { pipeline, reporter };
}

describe('createPipeline (extensions)', () => {
	it('waits for async extension registration even when extensions.use() is not awaited', async () => {
		const { pipeline } = createTestPipeline();
		const hook = jest.fn(({ artifact }: { artifact: string[] }) => ({
			artifact: [...artifact, 'extension-hook'],
		}));

		pipeline.extensions.use({
			key: 'test.async-extension',
			async register() {
				await Promise.resolve();
				return hook;
			},
		});

		const result = await pipeline.run({});

		expect(result.artifact).toEqual([
			'fragment',
			'extension-hook',
			'builder',
		]);
		expect(hook).toHaveBeenCalledTimes(1);
	});

	it('propagates async registration failures to pipeline.run()', async () => {
		const { pipeline } = createTestPipeline();
		pipeline.extensions.use({
			key: 'test.async-failure',
			async register() {
				await Promise.resolve();
				throw new Error('registration failed');
			},
		});

		await expect(pipeline.run({})).rejects.toThrow('registration failed');
	});

	it('reports rollback metadata via the extension coordinator when builders fail', async () => {
		const rollback = jest.fn(() => {
			throw new Error('rollback failure');
		});
		const onExtensionRollbackError = jest.fn();
		const { pipeline, reporter } = createTestPipeline({
			onExtensionRollbackError,
		});

		pipeline.extensions.use({
			key: 'test.rollback',
			register() {
				return ({ artifact }: { artifact: string[] }) => ({
					artifact: [...artifact, 'extension'],
					rollback,
				});
			},
		});

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.failure',
				kind: pipeline.builderKind,
				priority: 1,
				apply() {
					throw new Error('builder exploded');
				},
			})
		);

		try {
			await pipeline.run({});
			throw new Error('expected pipeline.run() to reject');
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe('builder exploded');
		}

		expect(rollback).toHaveBeenCalledTimes(1);
		expect(onExtensionRollbackError).toHaveBeenCalledTimes(1);

		const event = onExtensionRollbackError.mock.calls[0][0];
		expect(event.error).toBeInstanceOf(Error);
		expect((event.error as Error).message).toBe('rollback failure');
		expect(event.extensionKeys).toEqual(['test.rollback']);
		expect(event.hookSequence).toEqual(['test.rollback']);
		expect(event.errorMetadata).toEqual(
			expect.objectContaining({
				message: 'rollback failure',
				name: 'Error',
			})
		);
		expect(event.context.reporter).toBe(reporter);
	});
});

describe('createPipeline diagnostics', () => {
	it('replays stored diagnostics once when a reporter is available', async () => {
		const onDiagnostic = jest.fn();
		const { pipeline, reporter } = createTestPipeline({ onDiagnostic });

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.conflict',
				kind: pipeline.fragmentKind,
				mode: 'override',
				apply({ output }) {
					output.push('first');
				},
			})
		);

		expect(() =>
			pipeline.ir.use(
				createHelper<
					TestContext,
					void,
					string[],
					TestReporter,
					typeof pipeline.fragmentKind
				>({
					key: 'fragment.conflict',
					kind: pipeline.fragmentKind,
					mode: 'override',
					apply({ output }) {
						output.push('second');
					},
				})
			)
		).toThrow(
			'Multiple overrides registered for helper "fragment.conflict".'
		);

		expect(onDiagnostic).not.toHaveBeenCalled();

		await pipeline.run({});

		expect(onDiagnostic).toHaveBeenCalledTimes(1);
		expect(onDiagnostic).toHaveBeenCalledWith({
			reporter,
			diagnostic: expect.objectContaining({
				type: 'conflict',
				key: 'fragment.conflict',
			}),
		});

		await pipeline.run({});

		expect(onDiagnostic).toHaveBeenCalledTimes(1);
	});
});
