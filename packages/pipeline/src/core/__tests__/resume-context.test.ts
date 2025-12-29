import { prepareResumeContext } from '../runner/context';
import type {
	AgnosticRunnerDependencies,
	AgnosticState,
} from '../runner/types';
import type {
	PipelineDiagnostic,
	PipelinePauseSnapshot,
	PipelineReporter,
} from '../types';

describe('prepareResumeContext', () => {
	it('wires rollback handler and hook options from snapshot state', () => {
		const onExtensionRollbackError = jest.fn();
		const reporter: PipelineReporter = { warn: jest.fn() };

		const state: AgnosticState<
			{ id: string },
			{ value: number },
			{ reporter: PipelineReporter },
			PipelineReporter,
			PipelineDiagnostic
		> = {
			context: { reporter },
			reporter,
			runOptions: { id: 'resume' },
			userState: { value: 42 },
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

		const dependencies: AgnosticRunnerDependencies<
			{ id: string },
			{ value: number },
			{ reporter: PipelineReporter },
			PipelineReporter,
			PipelineDiagnostic,
			unknown
		> = {
			options: {
				createContext: () => ({ reporter }),
				createState: () => ({ value: 0 }),
				createError: (_code, message) => new Error(message),
				onExtensionRollbackError,
			},
			helperRegistries: new Map(),
			diagnosticManager: {
				record: () => undefined,
				readDiagnostics: () => [],
				setReporter: () => undefined,
				prepareRun: () => undefined,
				getDiagnostics: () => [],
				flagConflict: () => undefined,
				flagMissingDependency: () => undefined,
				flagUnusedHelper: () => undefined,
				endRun: () => undefined,
			},
			resolveRunResult: () => ({}),
			extensionHooks: [],
		};

		const resumeContext = prepareResumeContext(dependencies, snapshot);
		resumeContext.handleRollbackError({
			error: new Error('rollback'),
			extensionKeys: ['ext'],
			hookSequence: ['hook'],
			errorMetadata: {
				name: 'Error',
				message: 'rollback',
				stack: '',
				cause: undefined,
			},
			context: state.context,
		});

		const hookOptions = resumeContext.buildHookOptions(
			state,
			'resume-hook'
		);

		expect(onExtensionRollbackError).toHaveBeenCalled();
		expect(hookOptions.options).toEqual({ id: 'resume' });
		expect(hookOptions.artifact).toEqual({ value: 42 });
	});
});
