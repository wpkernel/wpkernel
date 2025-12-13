import type {
	Helper,
	HelperApplyOptions,
	HelperExecutionSnapshot,
	HelperKind,
	MaybePromise,
	PipelineDiagnostic,
	PipelineExtensionHookOptions,
	PipelineReporter,
	PipelineRunState,
	PipelineStep,
	PipelineExtension,
	PipelineExtensionRollbackErrorMetadata,
} from '../core/types';
export type {
	PipelineExtensionRollbackErrorMetadata,
	PipelineReporter,
	PipelineRunState,
	PipelineExtensionHookOptions,
};

/**
 * Standard pipeline extension lifecycles.
 * @public
 */
export type PipelineExtensionLifecycle =
	| 'prepare'
	| 'before-fragments'
	| 'after-fragments'
	| 'before-builders'
	| 'after-builders'
	| 'finalize'
	| (string & {});

/**
 * Metadata from fragment helper execution.
 * @public
 */
export interface FragmentFinalizationMetadata<
	TFragmentKind extends HelperKind = HelperKind,
> {
	readonly fragments: HelperExecutionSnapshot<TFragmentKind>;
}

/**
 * Complete execution metadata for all helper phases.
 * @public
 */
export interface PipelineExecutionMetadata<
	TFragmentKind extends HelperKind = HelperKind,
	TBuilderKind extends HelperKind = HelperKind,
> extends FragmentFinalizationMetadata<TFragmentKind> {
	readonly builders: HelperExecutionSnapshot<TBuilderKind>;
}

/**
 * Options for creating a pipeline.
 * @public
 */
export interface CreatePipelineOptions<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter = PipelineReporter,
	TDraft = unknown,
	TArtifact = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TRunResult = PipelineRunState<TArtifact, TDiagnostic>,
	TFragmentInput = unknown,
	TFragmentOutput = unknown,
	TBuilderInput = unknown,
	TBuilderOutput = unknown,
	TFragmentKind extends HelperKind = 'fragment',
	TBuilderKind extends HelperKind = 'builder',
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	> = Helper<
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
	> = Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly fragmentKind?: TFragmentKind;
	readonly builderKind?: TBuilderKind;
	readonly createError?: (code: string, message: string) => Error;
	readonly createBuildOptions: (options: TRunOptions) => TBuildOptions;
	readonly createContext: (options: TRunOptions) => TContext;
	readonly createFragmentState: (options: {
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
	}) => TDraft;
	readonly createFragmentArgs: (options: {
		readonly helper: TFragmentHelper;
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly draft: TDraft;
	}) => HelperApplyOptions<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter
	>;
	readonly finalizeFragmentState: (options: {
		readonly draft: TDraft;
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly helpers: FragmentFinalizationMetadata<TFragmentKind>;
	}) => TArtifact;
	readonly createBuilderArgs: (options: {
		readonly helper: TBuilderHelper;
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly artifact: TArtifact;
	}) => HelperApplyOptions<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter
	>;
	readonly createRunResult?: (options: {
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
	/**
	 * Optional hook invoked whenever a diagnostic is emitted during a run.
	 *
	 * Consumers can stream diagnostics to logs or UI shells while the
	 * pipeline executes instead of waiting for the final run result.
	 */
	readonly onDiagnostic?: (options: {
		readonly reporter: TReporter;
		readonly diagnostic: TDiagnostic;
	}) => void;
	readonly createExtensionHookOptions?: (options: {
		readonly context: TContext;
		readonly options: TRunOptions;
		readonly buildOptions: TBuildOptions;
		readonly artifact: TArtifact;
		readonly lifecycle: PipelineExtensionLifecycle;
	}) => PipelineExtensionHookOptions<TContext, TRunOptions, TArtifact>;
	readonly onExtensionRollbackError?: (options: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
	readonly onHelperRollbackError?: (options: {
		readonly error: unknown;
		readonly helper: TFragmentHelper | TBuilderHelper;
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
	/**
	 * Helper keys that should be treated as "already satisfied" for fragment
	 * dependency resolution (useful when a run intentionally omits certain
	 * fragments).
	 */
	readonly fragmentProvidedKeys?: readonly string[];
	/**
	 * Helper keys that should be treated as “already satisfied” for builder
	 * dependency resolution (e.g. builders depending on IR helpers that are
	 * executed in a different pipeline stage).
	 */
	readonly builderProvidedKeys?: readonly string[];
	readonly createConflictDiagnostic?: (options: {
		readonly helper: TFragmentHelper | TBuilderHelper;
		readonly existing: TFragmentHelper | TBuilderHelper;
		readonly message: string;
	}) => TDiagnostic;
	readonly createMissingDependencyDiagnostic?: (options: {
		readonly helper: TFragmentHelper | TBuilderHelper;
		readonly dependency: string;
		readonly message: string;
	}) => TDiagnostic;
	readonly createUnusedHelperDiagnostic?: (options: {
		readonly helper: TFragmentHelper | TBuilderHelper;
		readonly message: string;
	}) => TDiagnostic;
}

/**
 * A pipeline instance with helper registration and execution methods.
 * @public
 */
export interface Pipeline<
	TRunOptions,
	TRunResult,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter = PipelineReporter,
	TBuildOptions = unknown,
	TArtifact = unknown,
	TFragmentInput = unknown,
	TFragmentOutput = unknown,
	TBuilderInput = unknown,
	TBuilderOutput = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TFragmentKind extends HelperKind = 'fragment',
	TBuilderKind extends HelperKind = 'builder',
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	> = Helper<
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
	> = Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly fragmentKind: TFragmentKind;
	readonly builderKind: TBuilderKind;
	readonly ir: {
		use: (helper: TFragmentHelper) => void;
	};
	readonly builders: {
		use: (helper: TBuilderHelper) => void;
	};
	readonly extensions: {
		use: (
			extension: PipelineExtension<
				Pipeline<
					TRunOptions,
					TRunResult,
					TContext,
					TReporter,
					TBuildOptions,
					TArtifact,
					TFragmentInput,
					TFragmentOutput,
					TBuilderInput,
					TBuilderOutput,
					TDiagnostic,
					TFragmentKind,
					TBuilderKind,
					TFragmentHelper,
					TBuilderHelper
				>,
				TContext,
				TRunOptions,
				TArtifact
			>
		) => unknown | Promise<unknown>;
	};
	use: (
		helper:
			| TFragmentHelper
			| TBuilderHelper
			| Helper<TContext, unknown, unknown, TReporter, HelperKind>
	) => void;
	run: (options: TRunOptions) => MaybePromise<TRunResult>;
}
