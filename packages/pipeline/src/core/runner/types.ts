import type { RegisteredHelper } from '../dependency-graph';
import type { Program } from '../async-utils';
import type { ErrorFactory } from '../error-factory';
import type {
	Helper,
	HelperApplyOptions,
	HelperExecutionSnapshot,
	HelperKind,
	MaybePromise,
	PipelineDiagnostic,
	PipelineExtensionHookOptions,
	PipelineExtensionLifecycle,
	PipelineExtensionRollbackErrorMetadata,
	PipelineReporter,
	PipelineStep,
} from '../types';

export type { HelperExecutionSnapshot };
import type { PipelineRollback } from '../rollback';
import type {
	ExtensionCoordinator,
	ExtensionLifecycleState,
} from '../internal/extension-coordinator.types';

export type { ExtensionCoordinator, ExtensionLifecycleState };
import type { AgnosticDiagnosticManager } from './diagnostics';
import type { ExtensionHookEntry } from '../extensions';

export interface AgnosticRunnerOptions<
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
> {
	readonly createContext: (options: TRunOptions) => TContext;
	readonly createState: (options: {
		readonly context: TContext;
		readonly options: TRunOptions;
	}) => TUserState;
	readonly createError: ErrorFactory;
	readonly onExtensionRollbackError?: (options: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
	readonly onHelperRollbackError?: (options: {
		readonly error: unknown;
		readonly helper: unknown;
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
	readonly providedKeys?: Record<string, readonly string[]>;
}

/**
 * Mutable state captured while preparing a pipeline run.
 *
 * @category Pipeline
 * @internal
 */
export interface AgnosticRunContext<
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
> {
	readonly runOptions: TRunOptions;
	readonly context: TContext;
	readonly state: AgnosticState<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>;
	readonly steps: PipelineStep[];
	readonly pushStep: (entry: RegisteredHelper<unknown>) => void;
	readonly helperRegistries: Map<string, RegisteredHelper<unknown>[]>;
	readonly helperOrders: Map<string, RegisteredHelper<unknown>[]>;
	readonly buildHookOptions: (
		state: AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>,
		lifecycle: PipelineExtensionLifecycle
	) => PipelineExtensionHookOptions<TContext, TRunOptions, TUserState>;

	readonly handleRollbackError: (options: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
}

/**
 * Closed-world state threaded through composed pipeline programs.
 *
 * @category Pipeline
 * @internal
 */
export interface AgnosticState<
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
> {
	readonly context: TContext;
	readonly reporter: TReporter;
	readonly runOptions: TRunOptions;
	readonly userState: TUserState;

	// Registry Maps (Input)
	readonly helperRegistries: Map<string, RegisteredHelper<unknown>[]>;

	// Resolved Orders (Computed)
	readonly helperOrders?: Map<string, RegisteredHelper<unknown>[]>;

	// Execution State
	readonly steps: PipelineStep[];
	readonly diagnostics: TDiagnostic[];
	readonly executedLifecycles: Set<string>;

	readonly helperExecution?: Map<string, HelperExecutionSnapshot>;
	readonly helperRollbacks?: Map<
		string,
		Array<{
			readonly helper: unknown;
			readonly rollback: PipelineRollback;
		}>
	>;

	readonly extensionCoordinator?: ExtensionCoordinator<
		TContext,
		TRunOptions,
		TUserState
	>;
	readonly extensionState?: ExtensionLifecycleState<
		TContext,
		TRunOptions,
		TUserState
	>;
	readonly extensionStack?: Array<{
		readonly coordinator: ExtensionCoordinator<
			TContext,
			TRunOptions,
			TUserState
		>;
		readonly state: ExtensionLifecycleState<
			TContext,
			TRunOptions,
			TUserState
		>;
	}>;
}

// Re-export shared types
export type { ExtensionHookEntry };
export type RollbackCapableCoordinator<TContext, TOptions, TUserState> = {
	createRollbackHandler: <TResult>(
		state: ExtensionLifecycleState<TContext, TOptions, TUserState>
	) => (error: unknown) => MaybePromise<TResult>;
};

export type RollbackEntry<THelper> = {
	readonly helper: THelper;
	readonly rollback: PipelineRollback;
};

export type Halt<TRunResult> = {
	readonly __halt: true;
	readonly error?: unknown;
	readonly result?: TRunResult;
};

export type RollbackContext<TContext, TOptions, TUserState> = {
	readonly context: TContext;
	readonly extensionCoordinator?: RollbackCapableCoordinator<
		TContext,
		TOptions,
		TUserState
	>;
	readonly extensionState?: ExtensionLifecycleState<
		TContext,
		TOptions,
		TUserState
	>;
	readonly extensionStack?: Array<{
		readonly coordinator: RollbackCapableCoordinator<
			TContext,
			TOptions,
			TUserState
		>;
		readonly state: ExtensionLifecycleState<TContext, TOptions, TUserState>;
	}>;
};

export type StageEnv<
	TState,
	TRunResult,
	TContext,
	TOptions,
	TReporter extends PipelineReporter,
	TUserState,
> = {
	pushStep: (entry: RegisteredHelper<unknown>) => void;
	toRollbackContext: (
		state: TState
	) => RollbackContext<TContext, TOptions, TUserState>;
	halt: (error?: unknown) => Halt<TRunResult>;
	isHalt: (value: unknown) => value is Halt<TRunResult>;
	onHelperRollbackError?: (options: {
		readonly error: unknown;
		readonly helper: Helper<
			TContext,
			unknown,
			unknown,
			TReporter,
			HelperKind
		>;
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
};

export type PipelineStage<TState, TResult> = Program<TState | TResult>;

export type AgnosticStageDeps<
	TState,
	TResult,
	TContext,
	TRunOptions,
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
	TUserState,
> = {
	readonly runnerEnv: StageEnv<
		TState,
		TResult,
		TContext,
		TRunOptions,
		TReporter,
		TUserState
	>;
	readonly finalizeResult: PipelineStage<TState, Halt<TResult>>;
	readonly makeLifecycleStage: (
		lifecycle: string
	) => PipelineStage<TState, Halt<TResult>>;

	readonly commitStage: PipelineStage<TState, Halt<TResult>>;

	// Generic helper stage factory
	readonly makeHelperStage: (
		kind: string,
		spec?: {
			makeArgs?: (
				state: TState
			) => (entry: RegisteredHelper<unknown>) => unknown;
			onVisited?: (
				state: TState,
				visited: Set<string>,
				rollbacks: unknown[]
			) => TState;
		}
	) => PipelineStage<TState, Halt<TResult>>;

	readonly extensions: {
		readonly lifecycles?: readonly string[];
	};

	readonly diagnosticManager: AgnosticDiagnosticManager<
		TReporter,
		TDiagnostic
	>;
};

/**
 * Dependency bundle consumed by {@link initAgnosticRunner}.
 *
 * @category Pipeline
 * @internal
 */
export interface AgnosticRunnerDependencies<
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
> {
	readonly options: AgnosticRunnerOptions<
		TRunOptions,
		TUserState,
		TContext,
		TReporter
	>;

	// Generic registries for all helper kinds
	readonly helperRegistries: Map<string, RegisteredHelper<unknown>[]>;

	readonly diagnosticManager: AgnosticDiagnosticManager<
		TReporter,
		TDiagnostic
	>;

	readonly resolveRunResult: (state: {
		readonly diagnostics: readonly TDiagnostic[];
		readonly steps: readonly PipelineStep[];
		readonly context: TContext;
		readonly userState: TUserState;
		readonly options: TRunOptions;
		readonly helpers: unknown;
		readonly state: AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>;
	}) => TRunResult;

	readonly extensionHooks: ExtensionHookEntry<
		TContext,
		TRunOptions,
		TUserState
	>[];

	readonly extensionLifecycles?: readonly string[];

	readonly stages?: (
		deps: AgnosticStageDeps<
			AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>,
			TRunResult,
			TContext,
			TRunOptions,
			TReporter,
			TDiagnostic,
			TUserState
		>
	) => PipelineStage<
		AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>,
		Halt<TRunResult>
	>[];
}

export interface AgnosticRunner<
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
> {
	readonly prepareContext: (
		runOptions: TRunOptions
	) => AgnosticRunContext<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>;
	readonly executeRun: (
		context: AgnosticRunContext<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>
	) => MaybePromise<TRunResult>;
}

export type HelperInvokeOptions<
	THelper,
	TInput,
	TOutput,
	TContext,
	TReporter extends PipelineReporter,
> = {
	readonly helper: THelper;
	readonly args: HelperApplyOptions<TContext, TInput, TOutput, TReporter>;
	readonly next: () => MaybePromise<void>;
};

export type HelperStageSpec<
	TState,
	TContext,
	TReporter extends PipelineReporter,
	TKind extends HelperKind,
	THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
	TInput,
	TOutput,
> = {
	readonly getOrder: (state: TState) => RegisteredHelper<THelper>[];
	readonly makeArgs: (
		state: TState
	) => (
		entry: RegisteredHelper<THelper>
	) => HelperApplyOptions<TContext, TInput, TOutput, TReporter>;
	readonly onVisited: (
		state: TState,
		visited: Set<string>,
		rollbacks: RollbackEntry<THelper>[]
	) => TState;
	readonly readRollbacks?: (
		state: TState
	) => RollbackEntry<THelper>[] | undefined;
};

export type HelperStageRunPlan<
	TState,
	TRunResult,
	TContext,
	TOptions,
	TUserState,
	THelper extends { key: string },
> = {
	readonly state: TState;
	readonly program: Program<TState>;
	readonly rollbackPlan: HelperRollbackPlan<
		TContext,
		TOptions,
		TUserState,
		THelper
	>;
	readonly halt: (error?: unknown) => Halt<TRunResult>;
};

export type HelperRollbackPlan<
	TContext,
	TOptions,
	TUserState,
	THelper extends { key: string },
> = {
	readonly context: TContext;
	readonly rollbackContext: RollbackContext<TContext, TOptions, TUserState>;
	readonly helperRollbacks: readonly RollbackEntry<THelper>[];
	readonly onHelperRollbackError?: (options: {
		readonly error: unknown;
		readonly helper: THelper;
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
};
