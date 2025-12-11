import type {
	Helper,
	HelperKind,
	PipelineDiagnostic,
	PipelineReporter,
} from '../../types';
import type {
	PipelineRunner,
	PipelineRunnerDependencies,
} from '../pipeline-runner.types';
import { prepareContext } from './context';
import { executeRun } from './execution';

/**
 * Creates the orchestrator responsible for executing pipeline runs.
 *
 * @param    dependencies
 * @category Pipeline
 * @internal
 */
export function initPipelineRunner<
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
>(
	dependencies: PipelineRunnerDependencies<
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
): PipelineRunner<
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
> {
	return {
		prepareContext: (runOptions) =>
			prepareContext(dependencies, runOptions),
		executeRun: (runContext) => executeRun(dependencies, runContext),
	};
}
