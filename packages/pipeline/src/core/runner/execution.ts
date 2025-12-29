// Types are strictly defined and validated by build, but ESLint flags generic resolution as any.
// runProgram removed
import type {
	AgnosticRunContext,
	AgnosticRunnerDependencies,
	AgnosticState,
	HelperExecutionSnapshot,
	Halt,
	PipelineStage,
	PipelineStepResult,
	ExtensionCoordinator,
	ExtensionLifecycleState,
} from './types';
import type {
	PipelineReporter,
	PipelineDiagnostic,
	MaybePromise,
	PipelinePauseSnapshot,
	PipelinePaused,
} from '../types';
import { isPromiseLike, maybeThen } from '../async-utils';
import { createAgnosticProgram, createAgnosticStages } from './program';
import { isHalt, isPaused } from './stage-factories';
import { prepareResumeContext } from './context';

const createEmptySnapshot = (
	kind: string
): HelperExecutionSnapshot<string> => ({
	kind,
	registered: [],
	executed: [],
	missing: [],
});

const applyStageIndex = <TState extends { stageIndex?: number }>(
	state: TState,
	stageIndex: number
): TState => ({
	...state,
	stageIndex,
});

const finalizeRunState = <
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
	>,
	result: AgnosticState<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>
): MaybePromise<TRunResult> => {
	const extensionStack = result.extensionStack ?? [];
	const fallbackCommit =
		extensionStack.length === 0 &&
		result.extensionCoordinator &&
		result.extensionState
			? () => result.extensionCoordinator!.commit(result.extensionState!)
			: undefined;

	const commitPromise = fallbackCommit
		? fallbackCommit()
		: extensionStack.reduce(
				(
					previous: MaybePromise<void>,
					{
						coordinator,
						state: loopState,
					}: {
						coordinator: ExtensionCoordinator<
							TContext,
							TRunOptions,
							TUserState
						>;
						state: ExtensionLifecycleState<
							TContext,
							TRunOptions,
							TUserState
						>;
					}
				) => maybeThen(previous, () => coordinator.commit(loopState)),
				undefined as MaybePromise<void>
			);

	return maybeThen(commitPromise, () =>
		dependencies.resolveRunResult({
			diagnostics: result.diagnostics as TDiagnostic[],
			steps: result.steps,
			context: result.context,
			userState: result.userState,
			options: result.runOptions,
			helpers: {
				fragments: createEmptySnapshot('dummy-fragment'),
				builders: createEmptySnapshot('dummy-builder'),
			},
			state: result,
		})
	);
};

const runStagesIteratively = <
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
>(
	stages: PipelineStage<
		AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>,
		Halt<TRunResult>
	>[],
	initialState: AgnosticState<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>,
	startIndex: number
): MaybePromise<
	PipelineStepResult<
		AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>,
		TRunResult
	>
> => {
	const runFrom = (
		state: AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>,
		stageIndex: number
	): MaybePromise<
		PipelineStepResult<
			AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>,
			TRunResult
		>
	> => {
		let currentState = state;

		for (let index = stageIndex; index < stages.length; index += 1) {
			const stage = stages[index];
			if (!stage) {
				return currentState;
			}
			const stageState = applyStageIndex(currentState, index);
			const next = stage(stageState);

			if (isPromiseLike(next)) {
				return Promise.resolve(next).then((resolved) => {
					if (isHalt(resolved) || isPaused(resolved)) {
						return resolved;
					}
					return runFrom(
						resolved as AgnosticState<
							TRunOptions,
							TUserState,
							TContext,
							TReporter,
							TDiagnostic
						>,
						index + 1
					);
				});
			}

			if (isHalt(next) || isPaused(next)) {
				return next;
			}

			currentState = next as AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>;
		}

		return currentState;
	};

	return runFrom(initialState, startIndex);
};

export const executeRun = <
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
	>,
	runContext: AgnosticRunContext<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>
): MaybePromise<TRunResult> => {
	const {
		runOptions,
		context,
	}: AgnosticRunContext<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	> = runContext;

	// AgnosticState is already prepared by prepareContext

	const initialState: AgnosticState<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	> = runContext.state;

	if (!dependencies.stages) {
		return dependencies.resolveRunResult({
			diagnostics: [],
			steps: [],
			context,
			userState: initialState.userState,
			options: runOptions,
			helpers: {
				builders: createEmptySnapshot('dummy-builder'),
			},
			state: initialState,
		});
	}

	const program = createAgnosticProgram(dependencies, runContext);

	return maybeThen(
		program(initialState),
		(
			result:
				| AgnosticState<
						TRunOptions,
						TUserState,
						TContext,
						TReporter,
						TDiagnostic
				  >
				| Halt<TRunResult>
				| PipelinePaused<
						AgnosticState<
							TRunOptions,
							TUserState,
							TContext,
							TReporter,
							TDiagnostic
						>
				  >
		) => {
			if (isHalt(result)) {
				if (result.error) {
					throw result.error;
				}
				return result.result!;
			}
			if (isPaused(result)) {
				throw new Error(
					'Pipeline paused during executeRun. Use makeResumablePipeline to enable pause/resume.'
				);
			}

			return finalizeRunState(dependencies, result);
		}
	);
};

export const executeRunWithPause = <
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
	>,
	runContext: AgnosticRunContext<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>
): MaybePromise<
	| TRunResult
	| PipelinePaused<
			AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>
	  >
> => {
	const { runOptions, context } = runContext;

	const initialState = runContext.state;

	if (!dependencies.stages) {
		return dependencies.resolveRunResult({
			diagnostics: [],
			steps: [],
			context,
			userState: initialState.userState,
			options: runOptions,
			helpers: {
				builders: createEmptySnapshot('dummy-builder'),
			},
			state: initialState,
		});
	}

	const stages = createAgnosticStages(dependencies, runContext);
	const runResult = runStagesIteratively(stages, initialState, 0);

	return maybeThen(runResult, (result) => {
		if (isHalt(result)) {
			if (result.error) {
				throw result.error;
			}
			return result.result!;
		}

		if (isPaused(result)) {
			return result;
		}

		return finalizeRunState(dependencies, result);
	});
};

export const executeResume = <
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
	>,
	snapshot: PipelinePauseSnapshot<
		AgnosticState<TRunOptions, TUserState, TContext, TReporter, TDiagnostic>
	>,
	resumeInput?: unknown
): MaybePromise<
	| TRunResult
	| PipelinePaused<
			AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>
	  >
> => {
	if (!dependencies.stages) {
		return finalizeRunState(dependencies, snapshot.state);
	}

	const resumeContext = prepareResumeContext(dependencies, snapshot);
	const resumeState = {
		...resumeContext.state,
		resumeInput,
	};
	const stages = createAgnosticStages(dependencies, resumeContext);
	const runResult = runStagesIteratively(
		stages,
		resumeState,
		snapshot.stageIndex
	);

	return maybeThen(runResult, (result) => {
		if (isHalt(result)) {
			if (result.error) {
				throw result.error;
			}
			return result.result!;
		}

		if (isPaused(result)) {
			return result;
		}

		return finalizeRunState(dependencies, result);
	});
};
