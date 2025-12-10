import { maybeThen } from '../async-utils.js';
import {
	createDependencyGraph,
	type CreateDependencyGraphOptions,
	type RegisteredHelper,
} from '../dependency-graph.js';
import type {
	HelperDescriptor,
	Helper,
	HelperKind,
	PipelineReporter,
	PipelineDiagnostic,
	PipelineExtensionLifecycle,
	PipelineExtensionHookOptions,
	PipelineExtensionRollbackErrorMetadata,
	PipelineStep,
	MaybePromise,
	PipelineExecutionMetadata,
	HelperExecutionSnapshot,
} from '../types';
import {
	assertAllHelpersExecuted,
	buildExecutionSnapshot,
} from './helper-execution.js';
import { initExtensionCoordinator } from './extension-coordinator';
import type {
	PipelineRunContext,
	PipelineRunner,
	PipelineRunnerDependencies,
	PipelineState,
	Halt,
	RollbackEntry,
	RollbackContext,
	HelperRollbackPlan,
} from './pipeline-runner.types';
import type { ExtensionLifecycleState } from './extension-coordinator.types';
import { composeK, type Program } from '../async-utils.js';
import {
	isHalt,
	makeHelperStageFactory,
	makeFinalizeFragmentsStage,
	makeAfterFragmentsStage,
	makeCommitStage,
	makeFinalizeResultStage,
	runRollbackToHalt,
} from './pipeline-program-utils.js';

const AFTER_FRAGMENTS: PipelineExtensionLifecycle = 'after-fragments';

/**
 * Creates the orchestrator responsible for executing pipeline runs.
 *
 * The runner wires together dependency graph resolution, helper execution, and the official
 * extension framework via the {@link initExtensionCoordinator}. By extracting this logic, the
 * public {@link createPipeline} entry point remains focused on registration while the runner keeps
 * lifecycle sequencing isolated and testable.
 *
 * @param    dependencies - Bundled factory methods, diagnostics, and registered helpers
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

	const prepareContext = (
		runOptions: TRunOptions
	): PipelineRunContext<
		TRunOptions,
		TBuildOptions,
		TContext,
		TDraft,
		TArtifact,
		TFragmentHelper,
		TBuilderHelper
	> => {
		const buildOptions =
			dependencies.options.createBuildOptions(runOptions);
		const context = dependencies.options.createContext(runOptions);
		dependencies.diagnosticManager.setReporter(context.reporter);
		const draft = dependencies.options.createFragmentState({
			options: runOptions,
			context,
			buildOptions,
		});

		const fragmentOrder = createDependencyGraph(
			dependencies.fragmentEntries,
			{
				providedKeys: dependencies.options.fragmentProvidedKeys,
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper as HelperDescriptor;
					dependencies.diagnosticManager.flagMissingDependency(
						helper,
						dependencyKey,
						dependencies.fragmentKind
					);
					dependencies.diagnosticManager.flagUnusedHelper(
						helper,
						dependencies.fragmentKind,
						`could not execute because dependency "${dependencyKey}" was not found`,
						helper.dependsOn
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper as HelperDescriptor;
						dependencies.diagnosticManager.flagUnusedHelper(
							helper,
							dependencies.fragmentKind,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			},
			dependencies.createError
		).order;

		const steps: PipelineStep[] = [];
		const pushStep = (entry: RegisteredHelper<unknown>) => {
			const descriptor = entry.helper as HelperDescriptor;
			steps.push({
				id: entry.id,
				index: steps.length,
				key: descriptor.key,
				kind: descriptor.kind,
				mode: descriptor.mode,
				priority: descriptor.priority,
				dependsOn: descriptor.dependsOn,
				origin: descriptor.origin,
			});
		};

		const builderGraphOptions: CreateDependencyGraphOptions<TBuilderHelper> =
			{
				providedKeys: dependencies.options.builderProvidedKeys,
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper as HelperDescriptor;
					dependencies.diagnosticManager.flagMissingDependency(
						helper,
						dependencyKey,
						dependencies.builderKind
					);
					dependencies.diagnosticManager.flagUnusedHelper(
						helper,
						dependencies.builderKind,
						`could not execute because dependency "${dependencyKey}" was not found`,
						helper.dependsOn
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper as HelperDescriptor;
						dependencies.diagnosticManager.flagUnusedHelper(
							helper,
							dependencies.builderKind,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			};

		const hookOptionsFactory =
			dependencies.options.createExtensionHookOptions ??
			((hookOptions: {
				context: TContext;
				options: TRunOptions;
				buildOptions: TBuildOptions;
				artifact: TArtifact;
				lifecycle: PipelineExtensionLifecycle;
			}): PipelineExtensionHookOptions<
				TContext,
				TRunOptions,
				TArtifact
			> => ({
				context: hookOptions.context,
				options: hookOptions.options,
				artifact: hookOptions.artifact,
				lifecycle: hookOptions.lifecycle,
			}));

		const buildHookOptions = (
			artifact: TArtifact,
			lifecycle: PipelineExtensionLifecycle
		) =>
			hookOptionsFactory({
				context,
				options: runOptions,
				buildOptions,
				artifact,
				lifecycle,
			});

		const handleRollbackError =
			dependencies.options.onExtensionRollbackError ??
			((rollbackOptions: {
				readonly error: unknown;
				readonly extensionKeys: readonly string[];
				readonly hookSequence: readonly string[];
				readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
				readonly context: TContext;
			}) => {
				const { reporter } = rollbackOptions.context;
				const warn = reporter.warn;

				if (typeof warn === 'function') {
					warn.call(reporter, 'Pipeline extension rollback failed.', {
						error: rollbackOptions.error,
						errorName: rollbackOptions.errorMetadata.name,
						errorMessage: rollbackOptions.errorMetadata.message,
						errorStack: rollbackOptions.errorMetadata.stack,
						errorCause: rollbackOptions.errorMetadata.cause,
						extensions: rollbackOptions.extensionKeys,
						hookKeys: rollbackOptions.hookSequence,
					});
				}
			});

		return {
			runOptions,
			buildOptions,
			context,
			draft,
			fragmentOrder,
			steps,
			pushStep,
			builderGraphOptions,
			buildHookOptions,
			handleRollbackError,
		} satisfies PipelineRunContext<
			TRunOptions,
			TBuildOptions,
			TContext,
			TDraft,
			TArtifact,
			TFragmentHelper,
			TBuilderHelper
		>;
	};

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
		const { extensionCoordinator, extensionState } = state;

		if (!extensionCoordinator || !extensionState) {
			return;
		}

		return extensionCoordinator.commit(extensionState);
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

	const executeAfterFragments =
		(
			runContext: PipelineRunContext<
				TRunOptions,
				TBuildOptions,
				TContext,
				TDraft,
				TArtifact,
				TFragmentHelper,
				TBuilderHelper
			>
		) =>
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
				AFTER_FRAGMENTS,
				{
					hooks: dependencies.extensionHooks,
					hookOptions: runContext.buildHookOptions(
						state.artifact as TArtifact,
						AFTER_FRAGMENTS
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

	const makeAfterFragmentsProgram = (
		runContext: PipelineRunContext<
			TRunOptions,
			TBuildOptions,
			TContext,
			TDraft,
			TArtifact,
			TFragmentHelper,
			TBuilderHelper
		>
	): RunnerProgram =>
		makeAfterFragmentsStage<RunnerState, Halt<TRunResult>>({
			isHalt,
			execute: executeAfterFragments(runContext),
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

	const createCoreProgram = (
		runContext: PipelineRunContext<
			TRunOptions,
			TBuildOptions,
			TContext,
			TDraft,
			TArtifact,
			TFragmentHelper,
			TBuilderHelper
		>
	): RunnerProgram => {
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
			onHelperRollbackError: dependencies.options
				.onHelperRollbackError as
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

		const programs: RunnerProgram[] = [
			finalizeResultProgram,
			commitProgram,
			builderProgram,
			makeAfterFragmentsProgram(runContext),
			finalizeFragmentsProgram,
			fragmentProgram,
		];

		return composeK(...programs);
	};

	const executeRun = (
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
		const builderOrder = createDependencyGraph(
			dependencies.builderEntries,
			runContext.builderGraphOptions,
			dependencies.createError
		).order;

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
		};

		const coreProgram = createCoreProgram(runContext);
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
	};

	return {
		prepareContext,
		executeRun,
	} satisfies PipelineRunner<
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
}
