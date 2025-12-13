import { composeK, maybeThen, type Program } from '../async-utils';
import type {
	AgnosticRunnerDependencies,
	AgnosticRunContext,
	AgnosticStageDeps,
	AgnosticState,
	Halt,
	StageEnv,
	HelperStageSpec,
} from './types';
import {
	isHalt,
	makeHelperStageFactory,
	makeFinalizeResultStage,
	makeAfterFragmentsStage,
	makeCommitStage,
} from './stage-factories';
import type { RegisteredHelper } from '../dependency-graph';
import type {
	PipelineReporter,
	PipelineDiagnostic,
	MaybePromise,
	PipelineExtensionLifecycle,
	Helper,
} from '../types';

export const createAgnosticProgram = <
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
): Program<
	| AgnosticState<TRunOptions, TUserState, TContext, TReporter, TDiagnostic>
	| Halt<TRunResult>
> => {
	type RunnerState = AgnosticState<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>;
	type RunnerResult = RunnerState | Halt<TRunResult>;
	type RunnerProgram = Program<RunnerResult>;

	const halt = (error?: unknown): Halt<TRunResult> => ({
		__halt: true,
		error,
	});

	// Generic makeArgs factory
	const defaultMakeArgs =
		(state: RunnerState) => (_entry: RegisteredHelper<unknown>) => ({
			context: state.context,
			reporter: state.reporter,
			userState: state.userState,
		});

	// Runner Environment shared by all stages
	const runnerEnv = {
		pushStep: runContext.pushStep,
		toRollbackContext: (state: RunnerState) => ({
			context: state.context,
			extensionCoordinator: state.extensionCoordinator,
			extensionState: state.extensionState,
			extensionStack: state.extensionStack,
		}),
		halt,
		isHalt,
		onHelperRollbackError: dependencies.options.onHelperRollbackError,
	};

	// --- Stage Factories ---

	const makeStage = makeHelperStageFactory<
		RunnerState,
		TRunResult,
		TContext,
		TRunOptions,
		TReporter,
		TUserState
	>({
		pushStep: runContext.pushStep,
		toRollbackContext: (state) => ({
			context: state.context,
			extensionCoordinator: state.extensionCoordinator,
			extensionState: state.extensionState,
			extensionStack: state.extensionStack,
		}),
		halt,
		isHalt,
		onHelperRollbackError: dependencies.options.onHelperRollbackError,
	});

	const makeHelperStage = (
		kind: string,
		spec?: {
			makeArgs?: (
				state: RunnerState
			) => (entry: RegisteredHelper<unknown>) => unknown;
			onVisited?: (
				state: RunnerState,
				visited: Set<string>,
				rollbacks: unknown[]
			) => RunnerState;
		},
		createHelperArgs?: (args: {
			state: RunnerState;
			helper: unknown;
			context: TContext;
		}) => unknown
	): RunnerProgram => {
		// Construct the full stage spec
		const stageSpec = {
			getOrder: (state: RunnerState) =>
				state.helperOrders?.get(kind) ?? [],
			makeArgs: defaultMakeArgs,
			onVisited: (
				state: RunnerState,
				visited: Set<string>,
				rollbacks: unknown[]
			): RunnerState => {
				if (spec?.onVisited) {
					return spec.onVisited(state, visited, rollbacks);
				}
				return state;
			},
			readRollbacks: (state: RunnerState) =>
				state.helperRollbacks?.get(kind)?.map((r) => r.helper) ?? [],
			invoke: ({
				helper,
				args,
				next,
			}: {
				helper: unknown;
				args: unknown;
				next: () => MaybePromise<void>;
			}) => {
				// We don't have enough generic info here to fully type this,
				// but at runtime `makeStage` handles it.
				// For mapped arguments, we trust `createHelperArgs`.

				// Handle both Helper objects (with apply method) and direct functions
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const h = helper as any;
				if (typeof h === 'function') {
					return h(args, next);
				}
				if (h && typeof h.apply === 'function') {
					return h.apply(args, next);
				}

				// Should be unreachable if registry validates helpers
				throw new Error(
					`Invalid helper: expected function or object with .apply method. Got: ${typeof h}`
				);
			},
			...spec,
		};

		// Override makeArgs only if provided or createHelperArgs is present
		if (spec?.makeArgs) {
			stageSpec.makeArgs = spec.makeArgs;
		} else if (createHelperArgs) {
			// Adapter-like makeArgs wrapping createHelperArgs
			stageSpec.makeArgs =
				(state: RunnerState) => (entry: RegisteredHelper<unknown>) =>
					createHelperArgs({
						state,
						helper: entry.helper,
						context: state.context,
					});
		}

		return makeStage(
			kind,
			stageSpec as unknown as HelperStageSpec<
				RunnerState,
				TContext,
				TReporter,
				string,
				Helper<TContext, unknown, unknown, TReporter, string>,
				unknown,
				unknown
			>
		);
	};

	const makeLifecycleStage = (lifecycle: string): RunnerProgram =>
		makeAfterFragmentsStage<RunnerState, Halt<TRunResult>>({
			isHalt,
			execute: (state) => {
				state.executedLifecycles.add(lifecycle);
				const coordinator = state.extensionCoordinator;
				if (!coordinator) {
					return state;
				}

				// runContext.buildHookOptions expects AgnosticState (RunnerState)
				const hookOptions = runContext.buildHookOptions(
					state,
					lifecycle as unknown as PipelineExtensionLifecycle
				);

				return maybeThen(
					coordinator.runLifecycle(
						lifecycle as unknown as PipelineExtensionLifecycle,
						{
							hooks: dependencies.extensionHooks,
							hookOptions,
						}
					),
					(newExtensionState) => ({
						...state,
						extensionState: newExtensionState,
						extensionStack: [
							...(state.extensionStack ?? []),
							{
								coordinator,
								state: newExtensionState,
							},
						],
						userState: newExtensionState.artifact,
					})
				);
			},
		});

	// Commit Stage using the factory
	const commitStage: RunnerProgram = makeCommitStage<
		RunnerState,
		Halt<TRunResult>
	>({
		isHalt,
		commit: (state) => {
			const coordinator = state.extensionCoordinator;
			if (!coordinator) {
				return undefined;
			}
			return coordinator.commit(state.extensionState!);
		},
		rollbackToHalt: (_state, error) => {
			return {
				__halt: true,
				error,
			};
		},
	});

	const finalizeResultProgram: RunnerProgram = makeFinalizeResultStage<
		RunnerState,
		Halt<TRunResult>
	>({
		isHalt,
		finalize: (state) => {
			const s = state;
			const nextState = {
				...s,
				diagnostics: dependencies.diagnosticManager.readDiagnostics(),
			} as unknown as RunnerState;

			// Validate Ignored Hooks
			if (dependencies.extensionHooks.length > 0) {
				const visited = nextState.executedLifecycles;
				const ignoredLifecycles = new Set<string>();

				for (const hook of dependencies.extensionHooks) {
					if (!visited?.has(hook.lifecycle)) {
						ignoredLifecycles.add(hook.lifecycle);
					}
				}

				if (ignoredLifecycles.size > 0) {
					// We warn via reporter
					const ignoredList = Array.from(ignoredLifecycles)
						.map((l) => `"${l}"`)
						.join(', ');
					nextState.reporter.warn?.(
						`The following extension hooks will be ignored because their lifecycles were not executed: ${ignoredList}`
					);
				}
			}

			return nextState;
		},
	});

	const deps: AgnosticStageDeps<
		RunnerState,
		TRunResult,
		TContext,
		TRunOptions,
		TReporter,
		TDiagnostic,
		TUserState
	> = {
		runnerEnv: runnerEnv as unknown as StageEnv<
			RunnerState,
			TRunResult,
			TContext,
			TRunOptions,
			TReporter,
			TUserState
		>,
		finalizeResult: finalizeResultProgram,
		makeLifecycleStage,
		commitStage,
		makeHelperStage,
		extensions: {
			lifecycles: dependencies.extensionLifecycles,
		},
		diagnosticManager: dependencies.diagnosticManager,
	};

	if (!dependencies.stages) {
		throw new Error(
			"Agnostic Runner requires 'stages' factory to be defined."
		);
	}

	const effectiveStages = dependencies.stages(deps);
	return composeK<RunnerResult>(...[...effectiveStages].reverse());
};
