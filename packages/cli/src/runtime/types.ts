import type { Reporter } from '@wpkernel/core/reporter';
import type {
	Helper,
	HelperDescriptor,
	Pipeline as CorePipeline,
	PipelineExtension as CorePipelineExtension,
	PipelineExtensionHookOptions as CorePipelineExtensionHookOptions,
} from '@wpkernel/pipeline';
import type {
	BuilderHelper as PhpBuilderHelper,
	BuilderInput as BaseBuilderInput,
	BuilderOutput as PhpBuilderOutput,
	BuilderWriteAction as PhpBuilderWriteAction,
	PipelineContext as PhpPipelineContext,
	PipelinePhase,
} from '@wpkernel/php-json-ast';
import type { FragmentIrOptions, IRv1 } from '../ir/publicTypes';
import type { MutableIr } from '../ir/types';
import type { Workspace } from '../workspace/types';
import type { GenerationManifest } from '../apply/manifest';

type BasePipelineContext = PhpPipelineContext;

export type { PipelinePhase };

/**
 * Context object passed through the entire pipeline execution.
 *
 * @category Runtime
 */
export interface PipelineContext
	extends Omit<BasePipelineContext, 'workspace'> {
	/** The current workspace information. */
	readonly workspace: Workspace;
	/** The state of the code generation process. */
	readonly generationState: GenerationManifest;
}

/**
 * Options for running a pipeline.
 *
 * @category Runtime
 */
export interface PipelineRunOptions {
	/** The current phase of the pipeline execution. */
	readonly phase: PipelinePhase;
	/** The configuration object for the WPKernel project. */
	readonly config: FragmentIrOptions['config'];
	/** The namespace of the project. */
	readonly namespace: string;
	/** The origin of the configuration (e.g., 'project', 'workspace'). */
	readonly origin: string;
	/** The source path of the configuration file. */
	readonly sourcePath: string;
	/** The current workspace information. */
	readonly workspace: Workspace;
	/** The reporter instance for logging. */
	readonly reporter: Reporter;
	/** The state of the code generation process. */
	readonly generationState: GenerationManifest;
}

/**
 * Minimal options required by builder helpers.
 *
 * @category Runtime
 */
export interface BuilderOptions {
	readonly namespace: string;
	readonly origin: string;
	readonly sourcePath: string;
}

/**
 * Represents a single step executed within the pipeline.
 *
 * @category Runtime
 */
export interface PipelineStep extends HelperDescriptor {
	/** A unique identifier for the step. */
	readonly id: string;
	/** The execution order of the step. */
	readonly index: number;
}

/**
 * Diagnostic emitted when two helpers conflict.
 *
 * @category Runtime
 * @example
 * A generate helper overrides another helper with the same key.
 */
export interface ConflictDiagnostic {
	/** The type of diagnostic, always 'conflict'. */
	readonly type: 'conflict';
	/** The key of the helper that caused the conflict. */
	readonly key: string;
	/** The conflict resolution mode (e.g., 'override'). */
	readonly mode: HelperDescriptor['mode'];
	/** A list of helpers involved in the conflict. */
	readonly helpers: readonly string[];
	/** A descriptive message about the conflict. */
	readonly message: string;
	/** Helper kind associated with the conflict. */
	readonly kind?: HelperDescriptor['kind'];
}

/**
 * Diagnostic emitted when a required helper dependency is missing.
 *
 * @category Runtime
 */
export interface MissingDependencyDiagnostic {
	/** The type of diagnostic, always 'missing-dependency'. */
	readonly type: 'missing-dependency';
	/** The key of the helper emitting the diagnostic. */
	readonly key: string;
	/** Identifier of the missing dependency helper. */
	readonly dependency: string;
	/** A descriptive message about the missing dependency. */
	readonly message: string;
	/** Helper kind associated with the diagnostic. */
	readonly kind?: HelperDescriptor['kind'];
	/** Optional helper key associated with the dependency. */
	readonly helper?: string;
}

/**
 * Union of all diagnostics emitted by the pipeline.
 *
 * @category Runtime
 */
export interface UnusedHelperDiagnostic {
	/** The type of diagnostic, always 'unused-helper'. */
	readonly type: 'unused-helper';
	/** The key of the helper emitting the diagnostic. */
	readonly key: string;
	/** A descriptive message about the unused helper. */
	readonly message: string;
	/** Helper kind associated with the diagnostic. */
	readonly kind?: HelperDescriptor['kind'];
	/** Optional helper key flagged as unused. */
	readonly helper?: string;
	/** Dependency list used when determining helper usage. */
	readonly dependsOn?: readonly string[];
}

/**
 * Union of all diagnostics emitted by the pipeline.
 *
 * @category Runtime
 */
export type PipelineDiagnostic =
	| ConflictDiagnostic
	| MissingDependencyDiagnostic
	| UnusedHelperDiagnostic;

/**
 * The result of a pipeline run.
 *
 * @category Runtime
 */
export interface PipelineRunResult {
	/** The generated Intermediate Representation (IR). */
	readonly ir: IRv1;
	/** An array of diagnostic messages. */
	readonly diagnostics: readonly PipelineDiagnostic[];
	/** An array of executed pipeline steps. */
	readonly steps: readonly PipelineStep[];
}

/**
 * A helper specifically designed for fragment processing within the pipeline.
 *
 * @category Runtime
 */
export type FragmentHelper = Helper<
	PipelineContext,
	FragmentInput,
	FragmentOutput,
	PipelineContext['reporter'],
	'fragment'
>;

/**
 * Input for a fragment helper.
 *
 * @category Runtime
 */
export interface FragmentInput {
	/** Options for building the IR. */
	readonly options: FragmentIrOptions;
	/** The mutable Intermediate Representation draft. */
	readonly draft: MutableIr;
}

/**
 * Output for a fragment helper.
 *
 * @category Runtime
 */
export interface FragmentOutput {
	/** The mutable Intermediate Representation draft. */
	readonly draft: MutableIr;
	/**
	 * Assigns a partial `MutableIr` to the current draft.
	 * @param partial - The partial IR to assign.
	 */
	assign: (partial: Partial<MutableIr>) => void;
}

/**
 * Input for a builder helper.
 *
 * @category Runtime
 */
export interface BuilderInput extends Omit<BaseBuilderInput, 'options' | 'ir'> {
	/** Options for builder execution (no raw config). */
	readonly options: BuilderOptions;
	/** The finalized Intermediate Representation (IR). */
	readonly ir: IRv1 | null;
}

/**
 * Represents a write action performed by a builder helper.
 *
 * @category Runtime
 */
export type BuilderWriteAction = PhpBuilderWriteAction;

/**
 * Output for a builder helper.
 *
 * @category Runtime
 */
export type BuilderOutput = PhpBuilderOutput;

/**
 * A helper specifically designed for builder processing within the pipeline.
 *
 * @category Runtime
 */
export type BuilderHelper = PhpBuilderHelper<
	PipelineContext,
	BuilderInput,
	BuilderOutput
>;

/**
 * Options passed to a pipeline extension hook.
 *
 * Re-exports the core pipeline contract so extensions receive the full
 * `PipelineRunOptions` payload instead of the build-only subset.
 *
 * @category Runtime
 */
export type PipelineExtensionHookOptions = CorePipelineExtensionHookOptions<
	PipelineContext,
	PipelineRunOptions,
	IRv1
>;

/**
 * Result returned by a pipeline extension hook.
 *
 * @category Runtime
 */
export interface PipelineExtensionHookResult {
	/** Optional: A modified IR artifact. */
	readonly artifact?: IRv1;
	/** Optional: A function to commit changes made by the hook. */
	readonly commit?: () => Promise<void>;
	/** Optional: A function to rollback changes made by the hook. */
	readonly rollback?: () => Promise<void>;
}

/**
 * Represents a pipeline extension hook function.
 *
 * @category Runtime
 */
export type PipelineExtensionHook = (
	options: PipelineExtensionHookOptions
) => Promise<PipelineExtensionHookResult | void>;

/**
 * The main pipeline interface for CLI operations.
 *
 * @category Runtime
 */
export type Pipeline = CorePipeline<
	PipelineRunOptions,
	PipelineRunResult,
	PipelineContext,
	PipelineContext['reporter'],
	FragmentIrOptions,
	IRv1,
	FragmentInput,
	FragmentOutput,
	BuilderInput,
	BuilderOutput,
	PipelineDiagnostic,
	FragmentHelper['kind'],
	BuilderHelper['kind'],
	FragmentHelper,
	BuilderHelper
>;

/**
 * Represents a pipeline extension.
 *
 * @category Runtime
 */
export type PipelineExtension = CorePipelineExtension<
	Pipeline,
	PipelineContext,
	PipelineRunOptions,
	IRv1
>;

/**
 * Options for applying a fragment helper.
 *
 * @category Runtime
 */
export type FragmentApplyOptions = Parameters<FragmentHelper['apply']>[0];

/**
 * The `next` function for a fragment helper.
 *
 * @category Runtime
 */
export type FragmentNext = Parameters<FragmentHelper['apply']>[1];

/**
 * Options for applying a builder helper.
 *
 * @category Runtime
 */
export type BuilderApplyOptions = Parameters<BuilderHelper['apply']>[0];

/**
 * The `next` function for a builder helper.
 *
 * @category Runtime
 */
export type BuilderNext = Parameters<BuilderHelper['apply']>[1];
