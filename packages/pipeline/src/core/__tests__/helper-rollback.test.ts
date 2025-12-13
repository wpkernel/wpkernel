import { createHelper } from '../helper.js';
import { createPipeline } from '../../standard-pipeline/createPipeline.js';
import { createPipelineRollback } from '../rollback.js';
import type { Pipeline } from '../../standard-pipeline/types.js';
import type {
	HelperApplyOptions,
	// Pipeline, // Moved to standard-pipeline/types
	PipelineDiagnostic,
	PipelineExtensionRollbackErrorMetadata,
	PipelineReporter,
	PipelineRunState,
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
	readonly onHelperRollbackError?: ({
		error,
		helper,
		errorMetadata,
		context,
	}: {
		readonly error: unknown;
		readonly helper: any;
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
		onHelperRollbackError: options?.onHelperRollbackError,
	});

	// Register dummy fragment helper
	pipeline.ir.use(
		createHelper<
			TestContext,
			void,
			string[],
			TestReporter,
			typeof pipeline.fragmentKind
		>({
			key: 'fragment.dummy',
			kind: pipeline.fragmentKind,
			apply({ output }) {
				output.push('fragment');
			},
		})
	);

	// Register dummy builder helper
	pipeline.builders.use(
		createHelper<
			TestContext,
			void,
			string[],
			TestReporter,
			typeof pipeline.builderKind
		>({
			key: 'builder.dummy',
			kind: pipeline.builderKind,
			apply({ output }) {
				output.push('builder');
			},
		})
	);

	return { pipeline, reporter };
}

function runPipeline(
	pipeline: TestPipeline,
	options: TestRunOptions = {}
): Promise<TestRunResult | void> {
	return Promise.resolve().then(() => pipeline.run(options));
}

describe('Helper Rollback', () => {
	it('executes helper rollback when builder fails', async () => {
		const rollback = jest.fn();
		const onHelperRollbackError = jest.fn();
		const { pipeline } = createTestPipeline({ onHelperRollbackError });

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.with-rollback',
				kind: pipeline.builderKind,
				priority: 1,
				apply() {
					return {
						rollback: createPipelineRollback(rollback),
					};
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
				key: 'builder.failure',
				kind: pipeline.builderKind,
				priority: 0,
				apply() {
					throw new Error('builder failed');
				},
			})
		);

		await expect(runPipeline(pipeline)).rejects.toThrow('builder failed');

		expect(rollback).toHaveBeenCalled();
	});

	it('rolls back helpers in reverse order', async () => {
		const rollbackOrder: string[] = [];
		const { pipeline } = createTestPipeline();

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.first',
				kind: pipeline.builderKind,
				priority: 2,
				apply() {
					return {
						rollback: createPipelineRollback(() => {
							rollbackOrder.push('first');
						}),
					};
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
				key: 'builder.second',
				kind: pipeline.builderKind,
				priority: 1,
				apply() {
					return {
						rollback: createPipelineRollback(() => {
							rollbackOrder.push('second');
						}),
					};
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
				key: 'builder.failure',
				kind: pipeline.builderKind,
				priority: 0,
				apply() {
					throw new Error('builder failed');
				},
			})
		);

		await expect(runPipeline(pipeline)).rejects.toThrow('builder failed');

		expect(rollbackOrder).toEqual(['second', 'first']);
	});

	it('rolls back helpers respecting dependency order', async () => {
		const rollbackOrder: string[] = [];
		const { pipeline } = createTestPipeline();

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.dependency',
				kind: pipeline.builderKind,
				priority: 0,
				apply() {
					return {
						rollback: createPipelineRollback(() => {
							rollbackOrder.push('dependency');
						}),
					};
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
				key: 'builder.dependant',
				kind: pipeline.builderKind,
				priority: 5,
				dependsOn: ['builder.dependency'],
				apply() {
					return {
						rollback: createPipelineRollback(() => {
							rollbackOrder.push('dependant');
						}),
					};
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
				key: 'builder.failure-dep',
				kind: pipeline.builderKind,
				priority: 10,
				dependsOn: ['builder.dependant'],
				apply() {
					throw new Error('builder failed');
				},
			})
		);

		await expect(runPipeline(pipeline)).rejects.toThrow('builder failed');

		expect(rollbackOrder).toEqual(['dependant', 'dependency']);
	});

	it('continues rolling back after helper rollback fails', async () => {
		const rollbackCalls: string[] = [];
		const { pipeline } = createTestPipeline();

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.first',
				kind: pipeline.builderKind,
				priority: 2,
				apply() {
					return {
						rollback: createPipelineRollback(() => {
							rollbackCalls.push('first');
						}),
					};
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
				key: 'builder.second',
				kind: pipeline.builderKind,
				priority: 1,
				apply() {
					return {
						rollback: createPipelineRollback(() => {
							rollbackCalls.push('second');
							throw new Error('rollback error');
						}),
					};
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
				key: 'builder.failure',
				kind: pipeline.builderKind,
				priority: 0,
				apply() {
					throw new Error('builder failed');
				},
			})
		);

		await expect(runPipeline(pipeline)).rejects.toThrow('builder failed');

		expect(rollbackCalls).toEqual(['second', 'first']);
	});

	it('supports async rollbacks', async () => {
		const rollback = jest.fn(async () => {
			await Promise.resolve();
		});
		const { pipeline } = createTestPipeline();

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.async-rollback',
				kind: pipeline.builderKind,
				priority: 1,
				apply() {
					return {
						rollback: createPipelineRollback(rollback),
					};
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
				key: 'builder.failure',
				kind: pipeline.builderKind,
				priority: 0,
				apply() {
					throw new Error('builder failed');
				},
			})
		);

		await expect(runPipeline(pipeline)).rejects.toThrow('builder failed');

		expect(rollback).toHaveBeenCalled();
	});

	it('helper can return undefined rollback', async () => {
		const { pipeline } = createTestPipeline();

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				TestReporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.no-rollback',
				kind: pipeline.builderKind,
				priority: 1,
				apply() {
					return {};
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
				key: 'builder.failure',
				kind: pipeline.builderKind,
				priority: 0,
				apply() {
					throw new Error('builder failed');
				},
			})
		);

		await expect(runPipeline(pipeline)).rejects.toThrow('builder failed');

		// Should not throw
		expect(true).toBe(true);
	});
});
