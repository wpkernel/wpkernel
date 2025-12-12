import type {
	CreatePipelineOptions,
	Helper,
	HelperKind,
	Pipeline,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineRunState,
} from './types';
import { makePipeline, type MakePipelineArgs } from './makePipeline';

/**
 * Creates a pipeline orchestrator-the execution engine that powers WPKernel's code generation stack.
 *
 * The pipeline coordinates helper registration, dependency resolution, execution, diagnostics, and
 * extension hooks. Refer to the package README for a full walkthrough and advanced usage examples.
 *
 * @example
 * ```ts
 * const pipeline = createPipeline({
 *   fragmentKind: 'fragment',
 *   builderKind: 'builder',
 *   createContext: () => ({ reporter }),
 *   createFragmentState: () => ({}),
 *   finalizeFragmentState: ({ draft }) => draft,
 *   createRunResult: ({ artifact, diagnostics }) => ({ artifact, diagnostics }),
 *   createBuildOptions: () => ({}),
 *   createFragmentArgs: ({ helper, draft, context }) => ({
 *     helper,
 *     context,
 *     options: {},
 *     buildOptions: {},
 *     draft,
 *   }),
 *   createBuilderArgs: ({ helper, artifact, context }) => ({
 *     helper,
 *     context,
 *     options: {},
 *     buildOptions: {},
 *     artifact,
 *   }),
 * });
 *
 * pipeline.ir.use(createHelper({...}));
 * pipeline.extensions.use(createPipelineExtension({ key: 'acme.audit' }));
 * const result = await pipeline.run({});
 * console.log(result.diagnostics.length);
 * ```
 *
 * @category Pipeline
 */

export function createPipeline<
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
>(
	options: CreatePipelineOptions<
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
	>
): Pipeline<
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
> {
	return makePipeline<
		TRunOptions,
		TReporter,
		TContext,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TBuildOptions,
		TDraft,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>(
		options as MakePipelineArgs<
			TRunOptions,
			TReporter,
			TContext,
			TArtifact,
			TDiagnostic,
			TRunResult,
			TBuildOptions,
			TDraft,
			TFragmentInput,
			TFragmentOutput,
			TBuilderInput,
			TBuilderOutput,
			TFragmentKind,
			TBuilderKind,
			TFragmentHelper,
			TBuilderHelper
		>
	);
}
