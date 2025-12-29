import { executeResume, executeRun, executeRunWithPause } from './execution';
import { prepareContext } from './context';
import type {
	AgnosticResumableRunner,
	AgnosticRunner,
	AgnosticRunnerDependencies,
} from './types';
import type { PipelineReporter, PipelineDiagnostic } from '../types';

/**
 * Initializes an agnostic pipeline runner.
 *
 * @param dependencies - The dependencies required by the runner.
 * @returns An `AgnosticRunner` instance.
 *
 * @internal
 */
export const initAgnosticRunner = <
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
>(
	dependencies: AgnosticRunnerDependencies<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic,
		TRunResult
	>
): AgnosticRunner<
	TRunOptions,
	TUserState,
	TContext,
	TReporter,
	TDiagnostic,
	TRunResult
> => {
	return {
		prepareContext: (runOptions: TRunOptions) =>
			prepareContext(dependencies, runOptions),
		executeRun: (context) => executeRun(dependencies, context),
	};
};

export const initAgnosticResumableRunner = <
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
>(
	dependencies: AgnosticRunnerDependencies<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic,
		TRunResult
	>
): AgnosticResumableRunner<
	TRunOptions,
	TUserState,
	TContext,
	TReporter,
	TDiagnostic,
	TRunResult
> => {
	return {
		prepareContext: (runOptions: TRunOptions) =>
			prepareContext(dependencies, runOptions),
		executeRun: (context) => executeRunWithPause(dependencies, context),
		executeResume: (snapshot, resumeInput) =>
			executeResume(dependencies, snapshot, resumeInput),
	};
};
