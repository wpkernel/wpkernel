import { maybeThen } from '../../async-utils';
import { type RegisteredHelper } from '../../dependency-graph';
import type {
	Helper,
	HelperKind,
	PipelineDiagnostic,
	PipelineExecutionMetadata,
	PipelineReporter,
	MaybePromise,
} from '../../types';
import { isHalt } from '../pipeline-program-utils';
import type {
	PipelineRunContext,
	PipelineRunnerDependencies,
	PipelineState,
	Halt,
} from '../pipeline-runner.types';
import { createCoreProgram } from './program';

export const executeRun = <
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
	>,
	runContext: PipelineRunContext<
		TRunOptions,
		TBuildOptions,
		TContext,
		TDraft,
		TArtifact,
		TFragmentHelper,
		TBuilderHelper
	>
): MaybePromise<TRunResult> => {
	type RunnerState = PipelineState<
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
	>;
	type RunnerResult = RunnerState | Halt<TRunResult>;

	// Builder order is now pre-calculated in helperOrders
	const builderOrder = (runContext.helperOrders.get(
		dependencies.builderKind
	) ?? []) as RegisteredHelper<TBuilderHelper>[];

	const initialState: RunnerState = {
		context: runContext.context,
		reporter: runContext.context.reporter,
		runOptions: runContext.runOptions,
		buildOptions: runContext.buildOptions,
		fragmentEntries: dependencies.fragmentEntries,
		builderEntries: dependencies.builderEntries,
		fragmentOrder: runContext.fragmentOrder,
		builderOrder,
		fragmentVisited: new Set(),
		builderVisited: new Set(),
		draft: runContext.draft,
		artifact: null,
		steps: runContext.steps,
		diagnostics: [],
		fragmentRollbacks: [],
		builderRollbacks: [],
		helperOrders: runContext.helperOrders,
	};

	const coreProgram = createCoreProgram(dependencies, runContext);

	const toRunResult = (state: RunnerResult): MaybePromise<TRunResult> => {
		if (isHalt<TRunResult>(state)) {
			throw state.error ?? new Error('Pipeline halted');
		}

		return dependencies.resolveRunResult({
			artifact: state.artifact as TArtifact,
			diagnostics: state.diagnostics,
			steps: state.steps,
			context: state.context,
			buildOptions: state.buildOptions,
			options: state.runOptions,
			helpers: state.helpers as PipelineExecutionMetadata<
				TFragmentKind,
				TBuilderKind
			>,
		});
	};

	return maybeThen(coreProgram(initialState), toRunResult);
}; // End of executeRun
