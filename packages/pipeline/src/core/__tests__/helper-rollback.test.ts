import { createHelper } from '../helper.js';
import { makePipeline } from '../makePipeline.js';
import { createPipelineRollback } from '../rollback.js';
import type {
	AgnosticPipeline,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineRunState,
} from '../types.js';

type TestRunOptions = Record<string, never>;
type TestDiagnostic = PipelineDiagnostic;
type TestReporter = Required<PipelineReporter> & {
	readonly info: jest.Mock;
	readonly child: jest.Mock<TestReporter, []>;
};
type TestContext = { readonly reporter: TestReporter };
type TestUserState = unknown;
type TestRunResult = PipelineRunState<TestUserState, TestDiagnostic>;

type TestPipeline = AgnosticPipeline<
	TestRunOptions,
	TestRunResult,
	TestContext,
	TestReporter
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

	const pipeline = makePipeline<
		TestRunOptions,
		TestContext,
		TestReporter,
		TestUserState,
		TestDiagnostic,
		TestRunResult
	>({
		helperKinds: ['builder'],
		createError(code, message) {
			throw new Error(`[${code}] ${message}`);
		},
		createContext() {
			return { reporter } satisfies TestContext;
		},
	});

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
		const { pipeline } = createTestPipeline();

		pipeline.use(
			createHelper({
				key: 'builder.with-rollback',
				kind: 'builder',
				priority: 1,
				apply() {
					return {
						rollback: createPipelineRollback(rollback),
					};
				},
			})
		);

		pipeline.use(
			createHelper({
				key: 'builder.failure',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.first',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.second',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.failure',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.dependency',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.dependant',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.failure-dep',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.first',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.second',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.failure',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.async-rollback',
				kind: 'builder',
				priority: 1,
				apply() {
					return {
						rollback: createPipelineRollback(rollback),
					};
				},
			})
		);

		pipeline.use(
			createHelper({
				key: 'builder.failure',
				kind: 'builder',
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

		pipeline.use(
			createHelper({
				key: 'builder.no-rollback',
				kind: 'builder',
				priority: 1,
				apply() {
					return {};
				},
			})
		);

		pipeline.use(
			createHelper({
				key: 'builder.failure',
				kind: 'builder',
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
