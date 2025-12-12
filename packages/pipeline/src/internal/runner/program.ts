import { maybeThen, composeK, type Program } from '../../async-utils';
import { type RegisteredHelper } from '../../dependency-graph';
import {
	assertAllHelpersExecuted,
	buildExecutionSnapshot,
} from '../helper-execution';
import { initExtensionCoordinator } from '../extension-coordinator';
import type { ExtensionLifecycleState } from '../extension-coordinator.types';
import {
	isHalt,
	makeHelperStageFactory,
	makeFinalizeFragmentsStage,
	makeAfterFragmentsStage,
	makeCommitStage,
	makeFinalizeResultStage,
	runRollbackToHalt,
	type HelperStageSpec,
} from '../pipeline-program-utils';
import type {
	Helper,
	HelperKind,
	PipelineReporter,
	PipelineDiagnostic,
	PipelineExtensionLifecycle,
	PipelineExtensionRollbackErrorMetadata,
	PipelineExecutionMetadata,
	HelperExecutionSnapshot,
	MaybePromise,
	HelperApplyOptions,
} from '../../types';
import type {
	PipelineRunContext,
	PipelineRunnerDependencies,
	PipelineState,
	Halt,
	RollbackEntry,
	RollbackContext,
	HelperRollbackPlan,
	DefaultStageDeps,
	PipelineStage,
	StageEnv,
} from '../pipeline-runner.types';

const AFTER_FRAGMENTS: PipelineExtensionLifecycle = 'after-fragments';

export function defaultStages<
	TState,
	TResult,
	TContext,
	TRunOptions,
	TArtifact,
	TReporter extends PipelineReporter,
>(
	deps: DefaultStageDeps<
		TState,
		TResult,
		TContext,
		TRunOptions,
		TArtifact,
		TReporter
	>
): PipelineStage<TState, Halt<TResult>>[] {
	const {
		fragmentStage,
		finalizeFragments,
		builderStage,
		commitStage,
		finalizeResult,
		makeLifecycleStage,
		extensions,
	} = deps;

	const lifecycleStages = (extensions?.lifecycles ?? []).map(
		makeLifecycleStage
	);

	return [
		fragmentStage,
		finalizeFragments,
		...lifecycleStages,
		builderStage,
		commitStage,
		finalizeResult,
	];
}

export const createCoreProgram = <
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
): Program<
	| PipelineState<
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
	  >
	| Halt<TRunResult>
> => {
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
	type RunnerProgram = Program<RunnerResult>;
	type BuilderRollbackEntry = RollbackEntry<TBuilderHelper>;
	type FragmentRollbackEntry = RollbackEntry<TFragmentHelper>;

	const halt = (error?: unknown): Halt<TRunResult> => ({
		__halt: true,
		error,
	});

	const withFragmentExecution = (
		nextState: RunnerState,
		fragmentVisited: Set<string>,
		fragmentRollbacks: FragmentRollbackEntry[]
	): RunnerState => {
		dependencies.diagnosticManager.reviewUnusedHelpers(
			nextState.fragmentEntries,
			fragmentVisited,
			dependencies.fragmentKind
		);

		const fragmentExecution = buildExecutionSnapshot(
			nextState.fragmentEntries,
			fragmentVisited,
			dependencies.fragmentKind
		);

		assertAllHelpersExecuted(
			nextState.fragmentEntries,
			fragmentExecution,
			dependencies.fragmentKind,
			dependencies.diagnosticManager.describeHelper,
			dependencies.createError
		);

		return {
			...nextState,
			fragmentVisited,
			fragmentExecution,
			fragmentRollbacks,
		};
	};

	const withBuilderExecution = (
		nextState: RunnerState,
		builderVisited: Set<string>,
		builderRollbacks: BuilderRollbackEntry[]
	): RunnerState => {
		dependencies.diagnosticManager.reviewUnusedHelpers(
			nextState.builderEntries,
			builderVisited,
			dependencies.builderKind
		);

		const builderExecution = buildExecutionSnapshot(
			nextState.builderEntries,
			builderVisited,
			dependencies.builderKind
		);

		assertAllHelpersExecuted(
			nextState.builderEntries,
			builderExecution,
			dependencies.builderKind,
			dependencies.diagnosticManager.describeHelper,
			dependencies.createError
		);

		return {
			...nextState,
			builderVisited,
			builderExecution,
			builderRollbacks,
		};
	};

	const toFragmentArgs = (
		state: RunnerState,
		entry: RegisteredHelper<TFragmentHelper>
	) =>
		dependencies.options.createFragmentArgs({
			helper: entry.helper,
			options: state.runOptions,
			context: state.context,
			buildOptions: state.buildOptions,
			draft: state.draft,
		});

	const toBuilderArgs = (
		state: RunnerState,
		entry: RegisteredHelper<TBuilderHelper>
	) =>
		dependencies.options.createBuilderArgs({
			helper: entry.helper,
			options: state.runOptions,
			context: state.context,
			buildOptions: state.buildOptions,
			artifact: state.artifact as TArtifact,
		});

	const makeFragmentArgs =
		(state: RunnerState) => (entry: RegisteredHelper<TFragmentHelper>) =>
			toFragmentArgs(state, entry);

	const makeBuilderArgs =
		(state: RunnerState) => (entry: RegisteredHelper<TBuilderHelper>) =>
			toBuilderArgs(state, entry);

	const readFragmentRollbacks = (state: RunnerState) =>
		state.fragmentRollbacks;
	const readBuilderRollbacks = (state: RunnerState) =>
		state.builderRollbacks ?? [];

	const toRollbackContext = (
		state: RunnerState
	): RollbackContext<TContext, TRunOptions, TArtifact> => ({
		context: state.context,
		extensionCoordinator: state.extensionCoordinator,
		extensionState: state.extensionState,
		extensionStack: state.extensionStack,
	});

	const snapshotFragmentExecution = (
		state: RunnerState
	): HelperExecutionSnapshot<TFragmentKind> =>
		state.fragmentExecution ??
		buildExecutionSnapshot(
			state.fragmentEntries,
			state.fragmentVisited,
			dependencies.fragmentKind
		);

	const commitExtensions = (state: RunnerState): MaybePromise<void> => {
		const stack = state.extensionStack ?? [];

		// Fallback for states populated without stack (legacy/intermediate) or single lifecycle
		if (
			stack.length === 0 &&
			state.extensionCoordinator &&
			state.extensionState
		) {
			return state.extensionCoordinator.commit(state.extensionState);
		}

		return stack.reduce(
			(previous, { coordinator, state: extState }) =>
				maybeThen(previous, () => coordinator.commit(extState)),
			undefined as MaybePromise<void>
		);
	};

	const toBuilderRollbackPlan = (
		state: RunnerState
	): HelperRollbackPlan<
		TContext,
		TRunOptions,
		TArtifact,
		TBuilderHelper
	> => ({
		context: state.context,
		rollbackContext: toRollbackContext(state),
		helperRollbacks: state.builderRollbacks ?? [],
		onHelperRollbackError: dependencies.options.onHelperRollbackError as
			| ((options: {
					readonly error: unknown;
					readonly helper: TBuilderHelper;
					readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
					readonly context: TContext;
			  }) => void)
			| undefined,
	});

	const rollbackBuildersToHalt = (
		state: RunnerState,
		error: unknown
	): MaybePromise<Halt<TRunResult>> =>
		runRollbackToHalt(
			{
				rollbackPlan: toBuilderRollbackPlan(state),
				halt,
			},
			error
		);

	const executeLifecycle =
		(lifecycle: string) =>
		(state: RunnerState): MaybePromise<RunnerState> => {
			const extensionCoordinator = initExtensionCoordinator<
				TContext,
				TRunOptions,
				TArtifact
			>(({ error, extensionKeys, hookSequence, errorMetadata }) =>
				runContext.handleRollbackError({
					error,
					extensionKeys,
					hookSequence,
					errorMetadata,
					context: state.context,
				})
			);

			const extensionLifecycleState = extensionCoordinator.runLifecycle(
				lifecycle,
				{
					hooks: dependencies.extensionHooks,
					hookOptions: runContext.buildHookOptions(
						state.artifact as TArtifact,
						lifecycle
					),
				}
			);

			return maybeThen(
				extensionLifecycleState,
				(
					extensionState: ExtensionLifecycleState<
						TContext,
						TRunOptions,
						TArtifact
					>
				) => ({
					...state,
					artifact: extensionState.artifact,
					extensionCoordinator,
					extensionState,
					extensionStack: [
						...(state.extensionStack ?? []),
						{
							coordinator: extensionCoordinator,
							state: extensionState,
						},
					],
				})
			);
		};

	const snapshotHelpers = (
		state: RunnerState
	): PipelineExecutionMetadata<TFragmentKind, TBuilderKind> =>
		state.helpers ??
		({
			fragments:
				state.fragmentExecution ??
				buildExecutionSnapshot(
					state.fragmentEntries,
					state.fragmentVisited,
					dependencies.fragmentKind
				),
			builders:
				state.builderExecution ??
				buildExecutionSnapshot(
					state.builderEntries,
					state.builderVisited,
					dependencies.builderKind
				),
		} satisfies PipelineExecutionMetadata<TFragmentKind, TBuilderKind>);

	const finalizeState = (state: RunnerState): RunnerState => ({
		...state,
		helpers: snapshotHelpers(state),
		diagnostics: [
			...dependencies.diagnosticManager.readDiagnostics(),
		] as TDiagnostic[],
	});

	const finalizeFragmentsProgram: RunnerProgram = makeFinalizeFragmentsStage<
		RunnerState,
		Halt<TRunResult>,
		HelperExecutionSnapshot<TFragmentKind>
	>({
		isHalt,
		snapshotFragments: snapshotFragmentExecution,
		applyArtifact: (state, fragmentsExecution) => ({
			...state,
			artifact: dependencies.options.finalizeFragmentState({
				draft: state.draft,
				options: state.runOptions,
				context: state.context,
				buildOptions: state.buildOptions,
				helpers: {
					fragments: fragmentsExecution,
				},
			}),
			fragmentExecution: fragmentsExecution,
		}),
	});

	const makeLifecycleStage = (lifecycle: string): RunnerProgram =>
		makeAfterFragmentsStage<RunnerState, Halt<TRunResult>>({
			isHalt,
			execute: executeLifecycle(lifecycle),
		});

	const commitProgram: RunnerProgram = makeCommitStage<
		RunnerState,
		Halt<TRunResult>
	>({
		isHalt,
		commit: commitExtensions,
		rollbackToHalt: rollbackBuildersToHalt,
	});

	const finalizeResultProgram: RunnerProgram = makeFinalizeResultStage<
		RunnerState,
		Halt<TRunResult>
	>({
		isHalt,
		finalize: finalizeState,
	});

	const fragmentStageSpec = {
		getOrder: (state: RunnerState) => state.fragmentOrder,
		makeArgs: makeFragmentArgs,
		onVisited: (
			state: RunnerState,
			fragmentVisited: Set<string>,
			fragmentRollbacks: FragmentRollbackEntry[]
		): RunnerState =>
			withFragmentExecution(state, fragmentVisited, fragmentRollbacks),
		readRollbacks: readFragmentRollbacks,
	};

	const builderStageSpec = {
		getOrder: (state: RunnerState) => state.builderOrder,
		makeArgs: makeBuilderArgs,
		onVisited: (
			state: RunnerState,
			builderVisited: Set<string>,
			builderRollbacks: BuilderRollbackEntry[]
		): RunnerState =>
			withBuilderExecution(state, builderVisited, builderRollbacks),
		readRollbacks: readBuilderRollbacks,
	};

	const makeStage = makeHelperStageFactory<
		RunnerState,
		TRunResult,
		TContext,
		TRunOptions,
		TArtifact,
		TReporter
	>({
		pushStep: runContext.pushStep,
		toRollbackContext,
		halt,
		isHalt,
		onHelperRollbackError: dependencies.options.onHelperRollbackError as
			| ((options: {
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
			  }) => void)
			| undefined,
	});

	const fragmentProgram: RunnerProgram = makeStage(fragmentStageSpec);
	const builderProgram: RunnerProgram = makeStage(builderStageSpec);

	// We default to [AFTER_FRAGMENTS] for backward compatibility if extensionLifecycles is not provided
	// But initPipelineRunner callers (createPipeline) didn't provide it yet.
	// So we should fallback to [AFTER_FRAGMENTS] in deps creation.

	const runnerEnv: StageEnv<
		RunnerState,
		TRunResult,
		TContext,
		TRunOptions,
		TArtifact,
		TReporter
	> = {
		pushStep: runContext.pushStep,
		toRollbackContext,
		halt,
		isHalt,
		onHelperRollbackError: dependencies.options.onHelperRollbackError as
			| ((options: {
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
			  }) => void)
			| undefined,
	};

	const deps: DefaultStageDeps<
		RunnerState,
		TRunResult,
		TContext,
		TRunOptions,
		TArtifact,
		TReporter
	> = {
		runnerEnv,
		fragmentStage: fragmentProgram,
		builderStage: builderProgram,
		finalizeFragments: finalizeFragmentsProgram,
		commitStage: commitProgram,
		finalizeResult: finalizeResultProgram,
		makeLifecycleStage,
		extensions: {
			lifecycles:
				dependencies.extensionHooks.length > 0
					? (dependencies.extensionLifecycles ?? [AFTER_FRAGMENTS])
					: [],
		},
		makeHelperStage: (
			kind: string,
			stageSpec?: {
				makeArgs?: (
					state: RunnerState
				) => (entry: RegisteredHelper<unknown>) => unknown;
				onVisited?: (
					state: RunnerState,
					visited: Set<string>,
					rollbacks: unknown[]
				) => RunnerState;
			}
		) => {
			const spec = {
				getOrder: (state: RunnerState) =>
					state.helperOrders?.get(kind) ?? [],
				makeArgs: (state: RunnerState) => {
					if (stageSpec?.makeArgs) {
						return stageSpec.makeArgs(state) as unknown as (
							entry: RegisteredHelper<unknown>
						) => HelperApplyOptions<
							TContext,
							unknown,
							unknown,
							TReporter
						>;
					}
					// Fallback to specific factories for legacy kinds
					if (kind === dependencies.fragmentKind) {
						return makeFragmentArgs(state) as unknown as (
							entry: RegisteredHelper<unknown>
						) => HelperApplyOptions<
							TContext,
							unknown,
							unknown,
							TReporter
						>;
					}
					if (kind === dependencies.builderKind) {
						return makeBuilderArgs(state) as unknown as (
							entry: RegisteredHelper<unknown>
						) => HelperApplyOptions<
							TContext,
							unknown,
							unknown,
							TReporter
						>;
					}
					// For now, throw if unknown kind implies no args factory capable
					// In future, we can add generic factories map
					throw new Error(`No args factory for kind "${kind}"`);
				},
				onVisited: (
					state: RunnerState,
					visited: Set<string>,
					rollbacks: RollbackEntry<unknown>[]
				): RunnerState => {
					if (stageSpec?.onVisited) {
						return stageSpec.onVisited(
							state,
							visited,
							rollbacks as unknown[]
						);
					}
					// Re-use logic or generalize
					if (kind === dependencies.fragmentKind) {
						return withFragmentExecution(
							state,
							visited,
							rollbacks as FragmentRollbackEntry[]
						);
					}
					if (kind === dependencies.builderKind) {
						return withBuilderExecution(
							state,
							visited,
							rollbacks as BuilderRollbackEntry[]
						);
					}
					// General implementation for other kinds:
					// This mimics withFragmentExecution but on generic maps
					const entries = (state.helperOrders?.get(kind) ??
						[]) as RegisteredHelper<
						Helper<TContext, unknown, unknown, TReporter, string>
					>[];

					dependencies.diagnosticManager.reviewUnusedHelpers(
						entries,
						visited,
						kind
					);

					const snapshot = buildExecutionSnapshot(
						entries,
						visited,
						kind
					);

					assertAllHelpersExecuted(
						entries,
						snapshot,
						kind,
						dependencies.diagnosticManager.describeHelper,
						dependencies.createError
					);

					// Store execution and rollbacks in generic maps
					const helperExecution = new Map(
						state.helperExecution ?? []
					);
					helperExecution.set(kind, snapshot);

					const helperRollbacks = new Map(
						state.helperRollbacks ?? []
					);
					helperRollbacks.set(
						kind,
						rollbacks as RollbackEntry<unknown>[]
					);

					return {
						...state,
						helperExecution,
						helperRollbacks,
					};
				},
				readRollbacks: (state: RunnerState) => {
					if (kind === dependencies.fragmentKind) {
						return readFragmentRollbacks(
							state
						) as RollbackEntry<unknown>[];
					}
					if (kind === dependencies.builderKind) {
						return readBuilderRollbacks(
							state
						) as RollbackEntry<unknown>[];
					}
					return state.helperRollbacks?.get(kind);
				},
			};
			return makeStage(
				spec as unknown as HelperStageSpec<
					RunnerState,
					TContext,
					TReporter,
					HelperKind,
					Helper<TContext, unknown, unknown, TReporter, HelperKind>,
					unknown,
					unknown
				>
			);
		},
	};
	// The user proposal for defaultStages signature doesn't INCLUDE runnerEnv, but "stagesOverride" implementation might need it.
	// The user said: stages?: (deps: { runnerEnv; fragmentStage; ... })
	// So I should add runnerEnv to DefaultStageDeps or to a separate type extended by it?
	// I put it in DefaultStageDeps. Wait, I missed adding it to DefaultStageDeps type definition in step 122.
	// I need to add runnerEnv to DefaultStageDeps type in types file.

	const effectiveStages = dependencies.stages
		? dependencies.stages(deps)
		: defaultStages(deps);

	return composeK(...[...effectiveStages].reverse());
};
