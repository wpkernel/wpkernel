import type {
	CreateDependencyGraphOptions,
	RegisteredHelper,
} from '../dependency-graph';
import type { Program } from '../async-utils';
import type { ErrorFactory } from '../error-factory';
import type {
	CreatePipelineOptions,
	Helper,
	HelperApplyOptions,
	HelperExecutionSnapshot,
	HelperKind,
	MaybePromise,
	PipelineDiagnostic,
	PipelineExecutionMetadata,
	PipelineExtensionHookOptions,
	PipelineExtensionLifecycle,
	PipelineExtensionRollbackErrorMetadata,
	PipelineReporter,
	PipelineStep,
} from '../types';
import type { PipelineRollback } from '../rollback';
import type {
	ExtensionCoordinator,
	ExtensionLifecycleState,
} from './extension-coordinator.types';
import type { DiagnosticManager } from './diagnostic-manager.types';
import type { ExtensionHookEntry } from '../extensions';

/**
 * Mutable state captured while preparing a pipeline run. This mirrors the context consumed by
 * {@link executeHelpers} and downstream extension orchestration.
 *
 * @category Pipeline
 * @internal
 */
export interface PipelineRunContext<
	TRunOptions,
	TBuildOptions,
	TContext,
	TDraft,
	TArtifact,
	TFragmentHelper,
	TBuilderHelper,
> {
	readonly runOptions: TRunOptions;
	readonly buildOptions: TBuildOptions;
	readonly context: TContext;
	readonly draft: TDraft;
	readonly fragmentOrder: RegisteredHelper<TFragmentHelper>[];
	readonly steps: PipelineStep[];
	readonly pushStep: (entry: RegisteredHelper<unknown>) => void;
	readonly helperOrders: Map<string, RegisteredHelper<unknown>[]>;
	readonly builderGraphOptions: CreateDependencyGraphOptions<TBuilderHelper>;
	readonly buildHookOptions: (
		artifact: TArtifact,
		lifecycle: PipelineExtensionLifecycle
	) => PipelineExtensionHookOptions<TContext, TRunOptions, TArtifact>;
	readonly handleRollbackError: (options: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
}

/**
 * Dependency bundle consumed by {@link initPipelineRunner}. Splitting the type into a dedicated
 * module improves cognitive load in the implementation file and keeps the generics re-usable for
 * test doubles.
 *
 * @category Pipeline
 * @internal
 */
export interface PipelineRunnerDependencies<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDraft,
	TArtifact,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind extends HelperKind,
	TBuilderKind extends HelperKind,
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly options: CreatePipelineOptions<
		TRunOptions,
		TBuildOptions,
		TContext,
		TReporter,
		TDraft,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>;
	readonly fragmentEntries: RegisteredHelper<TFragmentHelper>[];
	readonly builderEntries: RegisteredHelper<TBuilderHelper>[];
	readonly fragmentKind: TFragmentKind;
	readonly builderKind: TBuilderKind;
	readonly diagnosticManager: DiagnosticManager<
		TRunOptions,
		TBuildOptions,
		TContext,
		TReporter,
		TDraft,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>;
	readonly helperRegistries: Map<string, RegisteredHelper<unknown>[]>;
	readonly createError: ErrorFactory;
	readonly resolveRunResult: (state: {
		readonly artifact: TArtifact;
		readonly diagnostics: readonly TDiagnostic[];
		readonly steps: readonly PipelineStep[];
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly options: TRunOptions;
		readonly helpers: PipelineExecutionMetadata<
			TFragmentKind,
			TBuilderKind
		>;
	}) => TRunResult;
	readonly extensionHooks: ExtensionHookEntry<
		TContext,
		TRunOptions,
		TArtifact
	>[];
	readonly extensionLifecycles?: string[];
	readonly stages?: (
		deps: DefaultStageDeps<
			PipelineState<
				TRunOptions,
				TBuildOptions,
				TContext,
				TReporter,
				TDraft,
				TArtifact,
				TDiagnostic,
				TFragmentInput,
				TFragmentOutput,
				TBuilderInput,
				TBuilderOutput,
				TFragmentKind,
				TBuilderKind,
				TFragmentHelper,
				TBuilderHelper
			>,
			TRunResult,
			TContext,
			TRunOptions,
			TArtifact,
			TReporter
		>
	) => PipelineStage<
		PipelineState<
			TRunOptions,
			TBuildOptions,
			TContext,
			TReporter,
			TDraft,
			TArtifact,
			TDiagnostic,
			TFragmentInput,
			TFragmentOutput,
			TBuilderInput,
			TBuilderOutput,
			TFragmentKind,
			TBuilderKind,
			TFragmentHelper,
			TBuilderHelper
		>,
		Halt<TRunResult>
	>[];
}

export type PipelineStage<TState, TResult> = Program<TState | TResult>;

export type DefaultStageDeps<
	TState,
	TResult,
	TContext,
	TRunOptions,
	TArtifact,
	TReporter extends PipelineReporter,
> = {
	readonly runnerEnv: StageEnv<
		TState,
		TResult,
		TContext,
		TRunOptions,
		TArtifact,
		TReporter
	>;
	readonly fragmentStage: PipelineStage<TState, Halt<TResult>>;
	readonly builderStage: PipelineStage<TState, Halt<TResult>>;
	readonly finalizeFragments: PipelineStage<TState, Halt<TResult>>;
	readonly commitStage: PipelineStage<TState, Halt<TResult>>;
	readonly finalizeResult: PipelineStage<TState, Halt<TResult>>;
	readonly makeLifecycleStage: (
		lifecycle: string
	) => PipelineStage<TState, Halt<TResult>>;
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
	readonly extensions?: {
		readonly lifecycles?: string[];
	};
};
/**
 * Public surface returned by {@link initPipelineRunner}. Downstream consumers receive a helper to
 * prepare the context (building dependency graphs, instantiating drafts) and an executor that runs
 * the prepared context through fragments, extensions, and builders.
 *
 * @category Pipeline
 * @internal
 */
export interface PipelineRunner<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDraft,
	TArtifact,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind extends HelperKind,
	TBuilderKind extends HelperKind,
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly prepareContext: (
		runOptions: TRunOptions
	) => PipelineRunContext<
		TRunOptions,
		TBuildOptions,
		TContext,
		TDraft,
		TArtifact,
		TFragmentHelper,
		TBuilderHelper
	>;
	readonly executeRun: (
		context: PipelineRunContext<
			TRunOptions,
			TBuildOptions,
			TContext,
			TDraft,
			TArtifact,
			TFragmentHelper,
			TBuilderHelper
		>
	) => MaybePromise<TRunResult>;
	readonly __types?: {
		diagnostic: TDiagnostic;
		helperArgs: HelperApplyOptions<unknown, unknown, unknown>;
	};
}

/**
 * Closed-world state threaded through composed pipeline programs. While the implementation still
 * mutates some nested values (e.g. `steps`), every program returns a new state value to keep the
 * orchestrator closed under composition.
 *
 * @category Pipeline
 * @internal
 */
export interface PipelineState<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDraft,
	TArtifact,
	TDiagnostic extends PipelineDiagnostic,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind extends HelperKind,
	TBuilderKind extends HelperKind,
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly context: TContext;
	readonly reporter: TReporter;
	readonly runOptions: TRunOptions;
	readonly buildOptions: TBuildOptions;
	readonly fragmentEntries: RegisteredHelper<TFragmentHelper>[];
	readonly builderEntries: RegisteredHelper<TBuilderHelper>[];
	readonly fragmentOrder: RegisteredHelper<TFragmentHelper>[];
	readonly builderOrder: RegisteredHelper<TBuilderHelper>[];
	readonly fragmentVisited: Set<string>;
	readonly builderVisited: Set<string>;
	readonly helperOrders?: Map<string, RegisteredHelper<unknown>[]>;
	readonly draft: TDraft;
	readonly artifact: TArtifact | null;
	readonly steps: PipelineStep[];
	readonly diagnostics: TDiagnostic[];
	readonly fragmentExecution?: HelperExecutionSnapshot<TFragmentKind>;
	readonly builderExecution?: HelperExecutionSnapshot<TBuilderKind>;
	readonly helperExecution?: Map<string, HelperExecutionSnapshot>;
	readonly helpers?: PipelineExecutionMetadata<TFragmentKind, TBuilderKind>;
	readonly fragmentRollbacks?: Array<{
		readonly helper: TFragmentHelper;
		readonly rollback: PipelineRollback;
	}>;
	readonly builderRollbacks?: Array<{
		readonly helper: TBuilderHelper;
		readonly rollback: PipelineRollback;
	}>;
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
		TArtifact
	>;
	readonly extensionState?: ExtensionLifecycleState<
		TContext,
		TRunOptions,
		TArtifact
	>;
	readonly extensionStack?: Array<{
		readonly coordinator: ExtensionCoordinator<
			TContext,
			TRunOptions,
			TArtifact
		>;
		readonly state: ExtensionLifecycleState<
			TContext,
			TRunOptions,
			TArtifact
		>;
	}>;
}

export type { ExtensionHookEntry };
export type RollbackCapableCoordinator<TContext, TOptions, TArtifact> = {
	createRollbackHandler: <TResult>(
		state: ExtensionLifecycleState<TContext, TOptions, TArtifact>
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
export type RollbackContext<TContext, TOptions, TArtifact> = {
	readonly context: TContext;
	readonly extensionCoordinator?: RollbackCapableCoordinator<
		TContext,
		TOptions,
		TArtifact
	>;
	readonly extensionState?: ExtensionLifecycleState<
		TContext,
		TOptions,
		TArtifact
	>;
	readonly extensionStack?: Array<{
		readonly coordinator: RollbackCapableCoordinator<
			TContext,
			TOptions,
			TArtifact
		>;
		readonly state: ExtensionLifecycleState<TContext, TOptions, TArtifact>;
	}>;
};
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

export type StageEnv<
	TState,
	TRunResult,
	TContext,
	TOptions,
	TArtifact,
	TReporter extends PipelineReporter,
> = {
	pushStep: (entry: RegisteredHelper<unknown>) => void;
	toRollbackContext: (
		state: TState
	) => RollbackContext<TContext, TOptions, TArtifact>;
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

export type HelperRollbackPlan<
	TContext,
	TOptions,
	TArtifact,
	THelper extends { key: string },
> = {
	readonly context: TContext;
	readonly rollbackContext: RollbackContext<TContext, TOptions, TArtifact>;
	readonly helperRollbacks: readonly RollbackEntry<THelper>[];
	readonly onHelperRollbackError?: (options: {
		readonly error: unknown;
		readonly helper: THelper;
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
};
