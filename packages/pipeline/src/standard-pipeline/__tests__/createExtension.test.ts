import { createHelper } from '../../core/helper';
import { createPipeline } from '../createPipeline';
import { createPipelineExtension } from '../../core/createExtension';
import type {
	HelperApplyOptions,
	PipelineDiagnostic,
	PipelineRunState,
	PipelineReporter,
} from '../../core/types';
import type { Pipeline } from '../types';

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

function createTestPipeline(): {
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

describe('createPipelineExtension', () => {
	it('registers setup helpers and hook outputs synchronously', async () => {
		const { pipeline } = createTestPipeline();
		const commit = jest.fn();
		const extensionBuilder = createHelper<
			TestContext,
			void,
			string[],
			TestReporter,
			typeof pipeline.builderKind
		>({
			key: 'builder.extension',
			kind: pipeline.builderKind,
			priority: 10,
			apply({ output }) {
				output.push('extension-builder');
			},
		});

		const extension = createPipelineExtension<
			TestPipeline,
			TestContext,
			TestRunOptions,
			TestArtifact
		>({
			key: 'test.extension',
			setup(currentPipeline) {
				currentPipeline.builders.use(extensionBuilder);
			},
			hook({ artifact }) {
				return {
					artifact: [...artifact, 'extension-hook'],
					commit,
				};
			},
		});

		// Explicitly NOT awaited to demonstrate sync execution
		const resultMaybePromise = pipeline.extensions.use(extension);

		// Assert that it returned synchronously (void/undefined, not a Promise)
		expect(resultMaybePromise).toBeUndefined();

		// We assume pipeline.run CAN be async, so we await that
		const result = await pipeline.run({});

		expect(result.artifact).toEqual([
			'fragment',
			'extension-hook',
			'extension-builder',
			'builder',
		]);
		expect(commit).toHaveBeenCalledTimes(1);
	});

	it('awaits asynchronous setup before registering hooks', async () => {
		const { pipeline } = createTestPipeline();
		const hookSpy = jest.fn();

		// Explicitly awaited
		await pipeline.extensions.use(
			createPipelineExtension<
				TestPipeline,
				TestContext,
				TestRunOptions,
				TestArtifact
			>({
				setup: async (currentPipeline) => {
					await Promise.resolve();

					currentPipeline.builders.use(
						createHelper<
							TestContext,
							void,
							string[],
							TestReporter,
							typeof pipeline.builderKind
						>({
							key: 'builder.async-extension',
							kind: pipeline.builderKind,
							priority: 5,
							apply({ output }) {
								output.push('async-extension-builder');
							},
						})
					);
				},
				hook({ artifact }) {
					hookSpy();
					return { artifact };
				},
			})
		);

		const result = await pipeline.run({});

		expect(result.artifact).toEqual([
			'fragment',
			'async-extension-builder',
			'builder',
		]);
		expect(hookSpy).toHaveBeenCalledTimes(1);
	});

	it('supports custom register implementations', async () => {
		const { pipeline } = createTestPipeline();
		const hook = jest.fn();

		await pipeline.extensions.use(
			createPipelineExtension<
				TestPipeline,
				TestContext,
				TestRunOptions,
				TestArtifact
			>({
				async register(currentPipeline) {
					currentPipeline.ir.use(
						createHelper<
							TestContext,
							void,
							string[],
							TestReporter,
							typeof pipeline.fragmentKind
						>({
							key: 'fragment.extra',
							kind: pipeline.fragmentKind,
							apply({ output }) {
								output.push('extra-fragment');
							},
						})
					);

					await Promise.resolve();

					return ({ artifact }) => {
						hook();
						return { artifact };
					};
				},
			})
		);

		const result = await pipeline.run({});

		expect(result.artifact).toEqual([
			'fragment',
			'extra-fragment',
			'builder',
		]);
		expect(hook).toHaveBeenCalledTimes(1);
	});

	it('wraps inline hooks with lifecycle metadata', async () => {
		const extension = createPipelineExtension<
			TestPipeline,
			TestContext,
			TestRunOptions,
			TestArtifact
		>({
			lifecycle: 'before-builders',
			hook: ({ artifact }) => ({ artifact }),
		});

		const registration = await extension.register({} as TestPipeline);

		expect(registration).toEqual({
			lifecycle: 'before-builders',
			hook: expect.any(Function),
		});
	});

	it('prioritises hook-provided lifecycle metadata', async () => {
		const extension = createPipelineExtension<
			TestPipeline,
			TestContext,
			TestRunOptions,
			TestArtifact
		>({
			lifecycle: 'prepare',
			hook: {
				lifecycle: 'after-builders',
				hook: ({ artifact }) => ({ artifact }),
			},
		});

		const registration = await extension.register({} as TestPipeline);

		expect(registration).toEqual({
			lifecycle: 'after-builders',
			hook: expect.any(Function),
		});
	});
});
