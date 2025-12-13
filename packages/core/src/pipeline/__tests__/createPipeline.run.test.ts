import { createPipeline, createHelper } from '@wpkernel/pipeline';

import { WPKernelError } from '../../error';
import type { Reporter } from '../../reporter/types';
import type {
	HelperApplyOptions,
	Pipeline,
	PipelineDiagnostic,
	PipelineExtensionHook,
	PipelineExtensionHookResult,
	PipelineRunState,
} from '@wpkernel/pipeline';

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as PromiseLike<unknown>).then === 'function'
	);
}

describe('createPipeline.run', () => {
	function createTestReporter(): Reporter {
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as Reporter;

		(reporter.child as jest.Mock).mockReturnValue(reporter);

		return reporter;
	}

	type TestRunOptions = Record<string, never>;
	type TestBuildOptions = Record<string, never>;
	type TestContext = { reporter: Reporter };
	type TestDraft = string[];
	type TestArtifact = string[];
	type TestDiagnostic = PipelineDiagnostic;
	type TestRunResult = PipelineRunState<TestArtifact, TestDiagnostic>;

	type TestPipeline = Pipeline<
		TestRunOptions,
		TestRunResult,
		TestContext,
		Reporter,
		TestBuildOptions,
		TestArtifact,
		void,
		string[],
		void,
		string[],
		TestDiagnostic
	>;

	function createTestPipeline({
		getReporter,
	}: {
		getReporter?: () => Reporter;
	} = {}): {
		pipeline: TestPipeline;
		reporter: Reporter;
	} {
		const fallbackReporter = createTestReporter();
		const resolveReporter = () => getReporter?.() ?? fallbackReporter;
		let reporter = resolveReporter();
		const pipeline = createPipeline<
			TestRunOptions,
			TestBuildOptions,
			TestContext,
			Reporter,
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
				const errorCode = code as
					| 'ValidationError'
					| 'DeveloperError'
					| 'UnknownError';
				return new WPKernelError(errorCode, { message });
			},
			createBuildOptions() {
				return {};
			},
			createContext() {
				const activeReporter = resolveReporter();
				reporter = activeReporter;
				return { reporter: activeReporter };
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
					Reporter
				>;
			},
			finalizeFragmentState({ draft }) {
				return draft;
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
					Reporter
				>;
			},
			createRunResult({ artifact, diagnostics, steps }) {
				return { artifact, diagnostics, steps } satisfies TestRunResult;
			},
		});

		return { pipeline, reporter };
	}

	it('returns synchronously when helpers do not yield promises', () => {
		const { pipeline } = createTestPipeline();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.one',
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
				Reporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.one',
				kind: pipeline.builderKind,
				apply({ output }) {
					output.push('builder');
				},
			})
		);

		const result = pipeline.run({});

		expect(isPromiseLike(result)).toBe(false);

		if (isPromiseLike(result)) {
			throw new Error('Expected synchronous pipeline run.');
		}

		const runResult = result as TestRunResult;
		expect(runResult.artifact).toEqual(['fragment', 'builder']);
		expect(runResult.diagnostics).toHaveLength(0);
		expect(runResult.steps.map((step) => step.key)).toEqual<
			readonly string[]
		>(['fragment.one', 'builder.one']);
	});

	it('returns a promise when helpers perform asynchronous work', async () => {
		const { pipeline } = createTestPipeline();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.async',
				kind: pipeline.fragmentKind,
				async apply({ output }) {
					await Promise.resolve();
					output.push('fragment');
				},
			})
		);

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.async',
				kind: pipeline.builderKind,
				apply({ output }) {
					return Promise.resolve().then(() => {
						output.push('builder');
					});
				},
			})
		);

		const result = pipeline.run({});
		expect(isPromiseLike(result)).toBe(true);

		const runResult = await result;
		expect(runResult.artifact).toEqual(['fragment', 'builder']);
	});

	it('waits for asynchronous extension hooks before resolving', async () => {
		const { pipeline } = createTestPipeline();
		const commitSpy = jest.fn();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.one',
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
				Reporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.one',
				kind: pipeline.builderKind,
				apply({ output }) {
					output.push('builder');
				},
			})
		);

		pipeline.extensions.use({
			key: 'async-extension',
			register:
				() =>
				async (): Promise<
					PipelineExtensionHookResult<TestArtifact>
				> => {
					await Promise.resolve();
					return {
						commit: async () => {
							await Promise.resolve();
							commitSpy();
						},
					};
				},
		});

		const result = pipeline.run({});
		expect(isPromiseLike(result)).toBe(true);

		const runResult = await result;
		expect(runResult.artifact).toEqual(['fragment', 'builder']);
		expect(commitSpy).toHaveBeenCalledTimes(1);
	});

	it('rolls back extension results when builders fail', async () => {
		const { pipeline } = createTestPipeline();
		const rollbackSpy = jest.fn();
		const commitSpy = jest.fn();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.one',
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
				Reporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.error',
				kind: pipeline.builderKind,
				apply() {
					return Promise.reject(new Error('builder failure'));
				},
			})
		);

		pipeline.extensions.use({
			key: 'failing-extension',
			register: () => {
				const hook: PipelineExtensionHook<
					TestContext,
					TestRunOptions,
					TestArtifact
				> = () =>
					Promise.resolve({
						commit: async () => {
							commitSpy();
						},
						rollback: async () => {
							rollbackSpy();
						},
					});

				return hook;
			},
		});

		await expect(pipeline.run({})).rejects.toThrow('builder failure');
		expect(commitSpy).not.toHaveBeenCalled();
		expect(rollbackSpy).toHaveBeenCalledTimes(1);
	});

	it('reports pipeline diagnostics through the reporter', () => {
		const { pipeline, reporter } = createTestPipeline();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.audit',
				kind: pipeline.fragmentKind,
				dependsOn: ['fragment.missing'],
				apply() {
					// no-op
				},
			})
		);

		expect(() => pipeline.run({})).toThrow(
			'Helpers depend on unknown helpers: "fragment.audit" → ["fragment.missing"]'
		);

		expect(reporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({
				type: 'missing-dependency',
				key: 'fragment.audit',
				dependency: 'fragment.missing',
			})
		);

		expect(reporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({
				type: 'unused-helper',
				key: 'fragment.audit',
			})
		);
	});

	it('replays pipeline diagnostics for each reporter when reused', () => {
		let currentReporter = createTestReporter();
		const firstReporter = currentReporter;
		const { pipeline } = createTestPipeline({
			getReporter: () => currentReporter,
		});

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.audit',
				kind: pipeline.fragmentKind,
				dependsOn: ['fragment.missing'],
				apply() {
					// no-op
				},
			})
		);

		expect(() => pipeline.run({})).toThrow(
			'Helpers depend on unknown helpers: "fragment.audit" → ["fragment.missing"]'
		);

		expect(firstReporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({
				type: 'missing-dependency',
				key: 'fragment.audit',
				dependency: 'fragment.missing',
			})
		);

		expect(firstReporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({
				type: 'unused-helper',
				key: 'fragment.audit',
			})
		);

		const secondReporter = createTestReporter();
		currentReporter = secondReporter;

		expect(() => pipeline.run({})).toThrow(
			'Helpers depend on unknown helpers: "fragment.audit" → ["fragment.missing"]'
		);

		expect(firstReporter.warn).toHaveBeenCalledTimes(2);

		expect(secondReporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({
				type: 'missing-dependency',
				key: 'fragment.audit',
				dependency: 'fragment.missing',
			})
		);

		expect(secondReporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({
				type: 'unused-helper',
				key: 'fragment.audit',
			})
		);
	});
});
