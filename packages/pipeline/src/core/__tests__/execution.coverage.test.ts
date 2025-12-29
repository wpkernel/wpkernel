import { executeResume, executeRunWithPause } from '../runner/execution';
import type {
	AgnosticRunContext,
	AgnosticRunnerDependencies,
	AgnosticState,
	Halt,
	PipelineStage,
	ExtensionCoordinator,
	ExtensionLifecycleState,
} from '../runner/types';
import type {
	PipelineDiagnostic,
	PipelinePauseSnapshot,
	PipelineReporter,
} from '../types';

describe('execution coverage', () => {
	type TestOptions = { id: string };
	type TestState = { count: number };
	type TestContext = { reporter: PipelineReporter };
	type TestDiagnostic = PipelineDiagnostic;
	type TestRunResult = { artifact: TestState };

	const baseDependencies = (
		overrides?: Partial<
			AgnosticRunnerDependencies<
				TestOptions,
				TestState,
				TestContext,
				PipelineReporter,
				TestDiagnostic,
				TestRunResult
			>
		>
	): AgnosticRunnerDependencies<
		TestOptions,
		TestState,
		TestContext,
		PipelineReporter,
		TestDiagnostic,
		TestRunResult
	> => ({
		options: {
			createContext: () => ({ reporter: {} }),
			createState: () => ({ count: 0 }),
			createError: (_code, message) => new Error(message),
		},
		helperRegistries: new Map(),
		diagnosticManager: {
			record: () => undefined,
			setReporter: () => undefined,
			readDiagnostics: () => [],
			getDiagnostics: () => [],
			flagConflict: () => undefined,
			flagMissingDependency: () => undefined,
			flagUnusedHelper: () => undefined,
			prepareRun: () => undefined,
			endRun: () => undefined,
		},
		resolveRunResult: ({ userState }) => ({ artifact: userState }),
		extensionHooks: [],
		...overrides,
	});

	const baseRunContext = (
		state: AgnosticState<
			TestOptions,
			TestState,
			TestContext,
			PipelineReporter,
			TestDiagnostic
		>
	): AgnosticRunContext<
		TestOptions,
		TestState,
		TestContext,
		PipelineReporter,
		TestDiagnostic
	> => ({
		runOptions: { id: 'run' },
		context: state.context,
		state,
		steps: state.steps,
		pushStep: () => undefined,
		helperRegistries: new Map(),
		helperOrders: new Map(),
		buildHookOptions: () => ({
			context: state.context,
			options: { id: 'run' },
			artifact: state.userState,
			lifecycle: 'after-fragments',
		}),
		handleRollbackError: () => undefined,
	});

	it('commits extension state without stack', async () => {
		const commit = jest.fn();
		const stages: PipelineStage<
			AgnosticState<
				TestOptions,
				TestState,
				TestContext,
				PipelineReporter,
				TestDiagnostic
			>,
			Halt<TestRunResult>
		>[] = [(state) => state];

		const dependencies = baseDependencies({
			stages: () => stages,
		});

		const extensionState: ExtensionLifecycleState<
			TestContext,
			TestOptions,
			TestState
		> = { artifact: { count: 0 }, results: [], hooks: [] };

		const state: AgnosticState<
			TestOptions,
			TestState,
			TestContext,
			PipelineReporter,
			TestDiagnostic
		> = {
			context: { reporter: {} },
			reporter: {},
			runOptions: { id: 'run' },
			userState: { count: 1 },
			helperRegistries: new Map(),
			helperOrders: new Map(),
			steps: [],
			diagnostics: [],
			executedLifecycles: new Set(),
			extensionCoordinator: {
				commit,
			} as unknown as AgnosticState<
				TestOptions,
				TestState,
				TestContext,
				PipelineReporter,
				TestDiagnostic
			>['extensionCoordinator'],
			extensionState,
		};

		const result = await executeRunWithPause(
			dependencies,
			baseRunContext(state)
		);

		expect(result).toEqual({ artifact: { count: 1 } });
		expect(commit).toHaveBeenCalled();
	});

	it('commits extension stack when present', async () => {
		const commit = jest.fn();
		const stages: PipelineStage<
			AgnosticState<
				TestOptions,
				TestState,
				TestContext,
				PipelineReporter,
				TestDiagnostic
			>,
			Halt<TestRunResult>
		>[] = [(state) => state];

		const dependencies = baseDependencies({
			stages: () => stages,
		});

		const coordinator: ExtensionCoordinator<
			TestContext,
			TestOptions,
			TestState
		> = {
			commit,
			runLifecycle: () =>
				({
					artifact: { count: 0 },
					results: [],
					hooks: [],
				}) as ExtensionLifecycleState<
					TestContext,
					TestOptions,
					TestState
				>,
			createRollbackHandler: () => (error: unknown) => {
				throw error;
			},
			handleRollbackError: () => undefined,
		};

		const state: AgnosticState<
			TestOptions,
			TestState,
			TestContext,
			PipelineReporter,
			TestDiagnostic
		> = {
			context: { reporter: {} },
			reporter: {},
			runOptions: { id: 'run' },
			userState: { count: 2 },
			helperRegistries: new Map(),
			helperOrders: new Map(),
			steps: [],
			diagnostics: [],
			executedLifecycles: new Set(),
			extensionCoordinator: coordinator,
			extensionState: { artifact: { count: 0 }, results: [], hooks: [] },
			extensionStack: [
				{
					coordinator,
					state: { artifact: { count: 0 }, results: [], hooks: [] },
				},
			],
		};

		const result = await executeRunWithPause(
			dependencies,
			baseRunContext(state)
		);

		expect(result).toEqual({ artifact: { count: 2 } });
		expect(commit).toHaveBeenCalled();
	});

	it('returns early when stages are undefined', async () => {
		const dependencies = baseDependencies({
			stages: undefined,
		});
		const state: AgnosticState<
			TestOptions,
			TestState,
			TestContext,
			PipelineReporter,
			TestDiagnostic
		> = {
			context: { reporter: {} },
			reporter: {},
			runOptions: { id: 'run' },
			userState: { count: 3 },
			helperRegistries: new Map(),
			helperOrders: new Map(),
			steps: [],
			diagnostics: [],
			executedLifecycles: new Set(),
		};

		const result = await executeRunWithPause(
			dependencies,
			baseRunContext(state)
		);

		expect(result).toEqual({ artifact: { count: 3 } });
	});

	it('resumes from snapshot with no stages', async () => {
		const dependencies = baseDependencies({
			stages: undefined,
		});
		const state: AgnosticState<
			TestOptions,
			TestState,
			TestContext,
			PipelineReporter,
			TestDiagnostic
		> = {
			context: { reporter: {} },
			reporter: {},
			runOptions: { id: 'run' },
			userState: { count: 4 },
			helperRegistries: new Map(),
			helperOrders: new Map(),
			steps: [],
			diagnostics: [],
			executedLifecycles: new Set(),
		};

		const snapshot: PipelinePauseSnapshot<typeof state> = {
			stageIndex: 0,
			state,
			createdAt: Date.now(),
		};

		const result = await executeResume(dependencies, snapshot);

		expect(result).toEqual({ artifact: { count: 4 } });
	});

	it('handles sync halt results', () => {
		const stages: PipelineStage<
			AgnosticState<
				TestOptions,
				TestState,
				TestContext,
				PipelineReporter,
				TestDiagnostic
			>,
			Halt<TestRunResult>
		>[] = [
			() => ({
				__halt: true,
				result: { artifact: { count: 9 } },
			}),
		];

		const dependencies = baseDependencies({
			stages: () => stages,
		});

		const state: AgnosticState<
			TestOptions,
			TestState,
			TestContext,
			PipelineReporter,
			TestDiagnostic
		> = {
			context: { reporter: {} },
			reporter: {},
			runOptions: { id: 'run' },
			userState: { count: 9 },
			helperRegistries: new Map(),
			helperOrders: new Map(),
			steps: [],
			diagnostics: [],
			executedLifecycles: new Set(),
		};

		const result = executeRunWithPause(dependencies, baseRunContext(state));

		expect(result).toEqual({ artifact: { count: 9 } });
	});
});
