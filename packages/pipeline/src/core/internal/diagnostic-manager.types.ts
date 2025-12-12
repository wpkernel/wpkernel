import type { RegisteredHelper } from '../dependency-graph';
import type {
	CreatePipelineOptions,
	Helper,
	HelperDescriptor,
	HelperKind,
	PipelineDiagnostic,
	PipelineReporter,
} from '../types';

/**
 * Shared structural contract for the diagnostic subsystem used by {@link createPipeline}.
 *
 * The `DiagnosticManager` is intentionally generic so that downstream pipelines can customise
 * context, helper kinds, artifact shapes, and reporter implementations without leaking internal
 * types. All implementations produced by {@link initDiagnosticManager} honour this interface.
 *
 * @template TRunOptions   - Options accepted by `pipeline.run()`
 * @template TBuildOptions - Options produced by `createBuildOptions`
 * @template TContext      - Pipeline execution context, including the reporter instance
 * @template TReporter     - Reporter type used to publish diagnostics
 * @template TDraft        - Fragment draft produced before builders execute
 * @template TArtifact     - Final artifact emitted by the pipeline
 * @template TDiagnostic   - Diagnostic entry recorded during execution
 * @template TRunResult    - Result returned by `pipeline.run()`
 * @template TFragmentInput  - Input passed to fragment helpers
 * @template TFragmentOutput - Output produced by fragment helpers
 * @template TBuilderInput   - Input passed to builder helpers
 * @template TBuilderOutput  - Output produced by builder helpers
 * @template TFragmentKind   - Helper kind identifier for fragment helpers
 * @template TBuilderKind    - Helper kind identifier for builder helpers
 * @template TFragmentHelper - Helper implementation registered in the fragment stage
 * @template TBuilderHelper  - Helper implementation registered in the builder stage
 *
 * @category Pipeline
 * @internal
 */
export interface DiagnosticManager<
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
	readonly describeHelper: (
		kind: HelperKind,
		helper: HelperDescriptor
	) => string;
	readonly flagConflict: (
		helper: HelperDescriptor,
		existing: HelperDescriptor,
		kind: HelperKind,
		message: string
	) => void;
	readonly flagMissingDependency: (
		helper: HelperDescriptor,
		dependency: string,
		kind: HelperKind
	) => void;
	readonly flagUnusedHelper: (
		helper: HelperDescriptor,
		kind: HelperKind,
		reason: string,
		dependsOn: readonly string[]
	) => void;
	readonly reviewUnusedHelpers: <THelper extends HelperDescriptor>(
		entries: RegisteredHelper<THelper>[],
		visited: Set<string>,
		kind: HelperKind
	) => void;
	setReporter: (reporter: TReporter) => void;
	record: (diagnostic: TDiagnostic) => void;
	readDiagnostics: () => TDiagnostic[];
	prepareRun: () => void;
	endRun: () => void;
	readonly __types?: {
		readonly runOptions: TRunOptions;
		readonly buildOptions: TBuildOptions;
		readonly draft: TDraft;
		readonly artifact: TArtifact;
		readonly runResult: TRunResult;
		readonly fragmentInput: TFragmentInput;
		readonly fragmentOutput: TFragmentOutput;
		readonly builderInput: TBuilderInput;
		readonly builderOutput: TBuilderOutput;
		readonly fragmentHelper: TFragmentHelper;
		readonly builderHelper: TBuilderHelper;
	};
}

/**
 * Configuration object consumed by {@link initDiagnosticManager}. Splitting the type from the
 * implementation keeps the orchestration module lightweight while enabling re-use in tests.
 *
 * @category Pipeline
 * @internal
 */
export interface DiagnosticManagerInitConfig<
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
	readonly fragmentKind: TFragmentKind;
	readonly builderKind: TBuilderKind;
}

export type { ErrorFactory } from '../error-factory';
