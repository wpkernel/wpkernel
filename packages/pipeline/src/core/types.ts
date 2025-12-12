import type { PipelineRollback } from './rollback.js';

/**
 * A type that can be either a value or a Promise of a value.
 * @public
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Helper kind identifier - can be 'fragment', 'builder', or any custom string.
 * @public
 */
export type HelperKind = 'fragment' | 'builder' | (string & {});

/**
 * Helper execution mode - determines how it integrates with existing helpers.
 *
 * @remarks
 * Currently only `extend` and `override` modes have implementation/validation logic.
 * The `merge` mode is reserved for future use.
 *
 * @public
 */
export type HelperMode = 'extend' | 'override' | 'merge';

/**
 * Base error type for pipeline operations.
 * Consumers can extend this to add framework-specific error codes.
 * @public
 */
export interface PipelineError extends Error {
	readonly code: string;
	readonly data?: Record<string, unknown>;
	readonly context?: Record<string, unknown>;
}

/**
 * Interface for reporting pipeline events and warnings.
 * @public
 */
export interface PipelineReporter {
	warn?: (message: string, context?: unknown) => void;
}

/**
 * Base descriptor for a pipeline helper.
 * @public
 */
export interface HelperDescriptor<TKind extends HelperKind = HelperKind> {
	readonly key: string;
	readonly kind: TKind;
	readonly mode: HelperMode;
	readonly priority: number;
	readonly dependsOn: readonly string[];
	readonly origin?: string;
	/**
	 * Whether this helper is optional and may not execute.
	 * Optional helpers won't cause validation errors if they don't run.
	 * Useful for conditional/feature-flag helpers.
	 * @defaultValue false
	 */
	readonly optional?: boolean;
}

/**
 * Options passed to a helper's apply function.
 * @public
 */
export interface HelperApplyOptions<
	TContext,
	TInput,
	TOutput,
	TReporter extends PipelineReporter = PipelineReporter,
> {
	readonly context: TContext;
	readonly input: TInput;
	readonly output: TOutput;
	readonly reporter: TReporter;
}
/**
 * Result returned from a helper's apply function.
 *
 * Helpers can declare rollback operations to be executed if the pipeline
 * encounters a failure after the helper completes.
 *
 * @public
 */
export interface HelperApplyResult<TOutput> {
	readonly output?: TOutput;
	readonly rollback?: PipelineRollback;
}

/**
 * Function signature for a pipeline helper's apply method.
 *
 * This function is responsible for transforming the pipeline's input and output.
 * It can optionally call `next()` to pass control to the next helper in the pipeline.
 *
 * Helpers can also return a result object with transformed output and optional rollback
 * for cleanup if the pipeline fails after the helper executes.
 *
 * @template TContext - The type of the pipeline context.
 * @template TInput - The type of the input artifact.
 * @template TOutput - The type of the output artifact.
 * @template TReporter - The type of the reporter used for logging.
 * @param    options - Options for the apply function, including context, input, output, and reporter.
 * @param    next    - Optional function to call the next helper in the pipeline.
 * @returns A promise that resolves when the helper has finished its work, or a result object with optional output and rollback.
 * @public
 */
export type HelperApplyFn<
	TContext,
	TInput,
	TOutput,
	TReporter extends PipelineReporter = PipelineReporter,
> = (
	options: HelperApplyOptions<TContext, TInput, TOutput, TReporter>,
	next?: () => MaybePromise<void>
) => MaybePromise<HelperApplyResult<TOutput> | void>;

/**
 * A complete pipeline helper with descriptor and apply function.
 * @public
 */
export interface Helper<
	TContext,
	TInput,
	TOutput,
	TReporter extends PipelineReporter = PipelineReporter,
	TKind extends HelperKind = HelperKind,
> extends HelperDescriptor<TKind> {
	readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
}

/**
 * Options for creating a new helper.
 * @public
 */
export interface CreateHelperOptions<
	TContext,
	TInput,
	TOutput,
	TReporter extends PipelineReporter = PipelineReporter,
	TKind extends HelperKind = HelperKind,
> {
	readonly key: string;
	readonly kind: TKind;
	readonly mode?: HelperMode;
	readonly priority?: number;
	readonly dependsOn?: readonly string[];
	readonly origin?: string;
	readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
}

/**
 * A pipeline step representing an executed helper.
 * @public
 */
export interface PipelineStep<TKind extends HelperKind = HelperKind>
	extends HelperDescriptor<TKind> {
	readonly id: string;
	readonly index: number;
}

/**
 * Diagnostic for conflicting helper registrations.
 * @public
 */
export interface ConflictDiagnostic<TKind extends HelperKind = HelperKind> {
	readonly type: 'conflict';
	readonly key: string;
	readonly mode: HelperMode;
	readonly helpers: readonly string[];
	readonly message: string;
	readonly kind?: TKind;
}

/**
 * Diagnostic for missing helper dependencies.
 * @public
 */
export interface MissingDependencyDiagnostic<
	TKind extends HelperKind = HelperKind,
> {
	readonly type: 'missing-dependency';
	readonly key: string;
	readonly dependency: string;
	readonly message: string;
	readonly kind?: TKind;
	readonly helper?: string;
}

/**
 * Diagnostic for unused helpers.
 * @public
 */
export interface UnusedHelperDiagnostic<TKind extends HelperKind = HelperKind> {
	readonly type: 'unused-helper';
	readonly key: string;
	readonly message: string;
	readonly kind?: TKind;
	readonly helper?: string;
	readonly dependsOn?: readonly string[];
}

/**
 * Union of all diagnostic types.
 * @public
 */
export type PipelineDiagnostic<TKind extends HelperKind = HelperKind> =
	| ConflictDiagnostic<TKind>
	| MissingDependencyDiagnostic<TKind>
	| UnusedHelperDiagnostic<TKind>;

/**
 * State returned from a pipeline run.
 * @public
 */
export interface PipelineRunState<
	TArtifact,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
> {
	readonly artifact: TArtifact;
	readonly diagnostics: readonly TDiagnostic[];
	readonly steps: readonly PipelineStep[];
}

/**
 * Snapshot of helper execution status.
 * @public
 */
export interface HelperExecutionSnapshot<
	TKind extends HelperKind = HelperKind,
> {
	readonly kind: TKind;
	readonly registered: readonly string[];
	readonly executed: readonly string[];
	readonly missing: readonly string[];
}

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
 * Options passed to pipeline extension hooks.
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

export interface PipelineExtensionHookOptions<TContext, TOptions, TArtifact> {
	readonly context: TContext;
	readonly options: TOptions;
	readonly artifact: TArtifact;
	readonly lifecycle: PipelineExtensionLifecycle;
}

/**
 * Result from a pipeline extension hook.
 * @public
 */
export interface PipelineExtensionHookResult<TArtifact> {
	readonly artifact?: TArtifact;
	readonly commit?: () => MaybePromise<void>;
	readonly rollback?: () => MaybePromise<void>;
}

/**
 * Metadata about an error during extension rollback.
 * @public
 */
export interface PipelineExtensionRollbackErrorMetadata {
	readonly name?: string;
	readonly message?: string;
	readonly stack?: string;
	readonly cause?: unknown;
}

/**
 * A pipeline extension hook function.
 * @public
 */
export type PipelineExtensionHook<TContext, TOptions, TArtifact> = (
	options: PipelineExtensionHookOptions<TContext, TOptions, TArtifact>
) => MaybePromise<PipelineExtensionHookResult<TArtifact> | void>;

/**
 * Hook registration returned by an extension.
 *
 * @public
 */
export interface PipelineExtensionHookRegistration<
	TContext,
	TOptions,
	TArtifact,
> {
	readonly lifecycle?: PipelineExtensionLifecycle;
	readonly hook: PipelineExtensionHook<TContext, TOptions, TArtifact>;
}

/**
 * A pipeline extension descriptor.
 * @public
 */
export interface PipelineExtension<TPipeline, TContext, TOptions, TArtifact> {
	readonly key?: string;
	register: (
		pipeline: TPipeline
	) => MaybePromise<
		PipelineExtensionRegisterOutput<TContext, TOptions, TArtifact>
	>;
}

export type PipelineExtensionRegisterOutput<TContext, TOptions, TArtifact> =
	| void
	| PipelineExtensionHook<TContext, TOptions, TArtifact>
	| PipelineExtensionHookRegistration<TContext, TOptions, TArtifact>;

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
