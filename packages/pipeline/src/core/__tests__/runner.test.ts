import { initAgnosticRunner } from '../runner';
import type {
	AgnosticRunnerDependencies,
	PipelineStage,
	AgnosticState,
	Halt,
} from '../runner/types';
import type { PipelineReporter, PipelineDiagnostic } from '../types';
import type { RegisteredHelper } from '../dependency-graph';

describe('Agnostic Runner', () => {
	type TestOptions = { initialCount: number };
	type TestState = { count: number; log: string[] };
	type TestContext = { reporter: PipelineReporter };
	type TestReporter = PipelineReporter;
	type TestDiagnostic = PipelineDiagnostic;
	type TestRunResult = TestState;

	const mockReporter = { warn: jest.fn() };
	const createError = (code: string, message: string) => {
		const err = new Error(message);
		(err as any).code = code;
		return err;
	};

	const resolveRunResult = ({ userState }: { userState: TestState }) =>
		userState;

	// Helper map
	const helperRegistries = new Map<string, RegisteredHelper<unknown>[]>();
	helperRegistries.set('adder', [
		{
			id: 'add1',
			index: 0,
			helper: {
				key: 'add1',
				kind: 'adder',
				priority: 10,
				dependsOn: [],
				run: (s: TestState) => (s.count += 1),
			} as any,
		},
		{
			id: 'add2',
			index: 1,
			helper: {
				key: 'add2',
				kind: 'adder',
				priority: 20,
				dependsOn: [],
				run: (s: TestState) => (s.count += 2),
			} as any,
		},
	]);

	// Simple generic stage
	const makeStages = (deps: any): PipelineStage<any, Halt<any>>[] => {
		const { runnerEnv } = deps;
		return [
			(state: AgnosticState<any, TestState, any, any, any>) => {
				// Manually run helpers for test
				const entries = state.helperOrders?.get('adder') || [];
				entries.forEach((entry) => {
					runnerEnv.pushStep(entry);
					(entry.helper as any).run(state.userState);
					state.userState.log.push(`ran ${entry.id}`);
				});
				return state;
			},
			deps.finalizeResult,
		];
	};

	it('initializes and executes a run with pure state', async () => {
		const dependencies: AgnosticRunnerDependencies<
			TestOptions,
			TestState,
			TestContext,
			TestReporter,
			TestDiagnostic,
			TestRunResult
		> = {
			options: {
				createContext: () => ({ reporter: mockReporter }),
				createState: ({ options }) => ({
					count: options.initialCount,
					log: [],
				}),
				createError,
			},
			helperRegistries,
			diagnosticManager: {
				readDiagnostics: () => [],
				setReporter: jest.fn(),
				prepareRun: jest.fn(),
				getDiagnostics: () => [],
			} as any,
			resolveRunResult: resolveRunResult as any,
			extensionHooks: [],
			stages: makeStages as any,
		};

		const runner = initAgnosticRunner(dependencies);
		const context = runner.prepareContext({ initialCount: 10 });
		const result = await runner.executeRun(context);

		expect(result.count).toBe(13); // 10 + 1 + 2
		expect(result.log).toEqual(['ran add2', 'ran add1']); // Priority sort: add2(20) > add1(10)
		// Wait, default dependency graph sort is topological + priority.
		// Assuming no dependsOn, generic sort needs to handle priority.
		// Standard createDependencyGraph handles priority.
		// Let's see if priority works.
	});
});
