import {
	isPromiseLike,
	maybeThen,
	maybeTry,
	type Program,
} from '../async-utils';
import { executeHelpers } from '../execution-utils';
import type { PipelineRollback } from '../rollback';
import type {
	Helper,
	HelperApplyOptions,
	HelperKind,
	MaybePromise,
	PipelinePaused,
	PipelineExtensionRollbackErrorMetadata,
	PipelineReporter,
} from '../types';
import type { RegisteredHelper } from '../dependency-graph';
import type {
	Halt,
	HelperInvokeOptions,
	RollbackEntry,
	StageEnv,
	HelperStageSpec,
	HelperRollbackPlan,
} from './types';
import { runHelperStageWithRollback } from './rollback';

interface StateWithExecution {
	helperExecution?: Map<
		string,
		{
			executed: readonly string[];
			registered: unknown[];
			missing: unknown[];
			kind: string;
		}
	>;
}

interface HelperWithKey {
	key: string;
}

export function isHalt<TRunResult>(value: unknown): value is Halt<TRunResult> {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'__halt' in value &&
			(value as { __halt?: unknown }).__halt === true
	);
}

export function isPaused<TState>(
	value: unknown
): value is PipelinePaused<TState> {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'__paused' in value &&
			(value as { __paused?: unknown }).__paused === true
	);
}

/**
 * Generic stage constructor that executes an ordered helper list with middleware-style `next()`.
 * @param options
 * @param options.getOrder
 * @param options.makeArgs
 * @param options.invoke
 * @param options.recordStep
 * @param options.onVisited
 * @param options.registerRollback
 */
export function createHelpersProgram<
	TContext,
	TReporter extends PipelineReporter,
	TKind extends HelperKind,
	THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
	TInput,
	TOutput,
	TState,
>(options: {
	getOrder: (state: TState) => RegisteredHelper<THelper>[];
	makeArgs: (
		state: TState
	) => (
		entry: RegisteredHelper<THelper>
	) => HelperApplyOptions<TContext, TInput, TOutput, TReporter>;
	invoke: (
		invokeOptions: HelperInvokeOptions<
			THelper,
			TInput,
			TOutput,
			TContext,
			TReporter
		>
	) => MaybePromise<void>;
	recordStep: (entry: RegisteredHelper<unknown>) => void;
	onVisited: (state: TState, visited: Set<string>) => TState;
	registerRollback?: (helper: THelper, result: unknown) => void;
}): (state: TState) => MaybePromise<TState> {
	const {
		getOrder,
		makeArgs,
		invoke,
		recordStep,
		onVisited,
		registerRollback,
	} = options;

	const invokeWithOptionalRollback = (
		helper: THelper,
		args: HelperApplyOptions<TContext, TInput, TOutput, TReporter>,
		next: () => MaybePromise<void>
	): MaybePromise<void> => {
		const invocation = invoke({ helper, args, next });

		if (!registerRollback) {
			return invocation;
		}

		if (isPromiseLike(invocation)) {
			return invocation.then((resolved) => {
				registerRollback(helper, resolved);
				return undefined;
			});
		}

		registerRollback(helper, invocation);
		return invocation;
	};

	return (state) => {
		const order = getOrder(state);
		const visitedOrPromise = executeHelpers<
			TContext,
			TInput,
			TOutput,
			TReporter,
			TKind,
			THelper,
			HelperApplyOptions<TContext, TInput, TOutput, TReporter>
		>(order, makeArgs(state), invokeWithOptionalRollback, recordStep);

		return maybeThen(visitedOrPromise, (visited) =>
			onVisited(state, visited)
		);
	};
}

/**
 * Pure finalizer for fragment state.
 * @param options
 * @param options.isHalt
 * @param options.snapshotFragments
 * @param options.applyArtifact
 * @param options.isPaused
 */
export function makeFinalizeFragmentsStage<
	TState,
	THalt extends Halt<unknown>,
	TFragments,
>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	isPaused?: (value: unknown) => value is PipelinePaused<TState>;
	snapshotFragments: (state: TState) => TFragments;
	applyArtifact: (state: TState, fragments: TFragments) => TState;
}): Program<TState | THalt | PipelinePaused<TState>> {
	const {
		isHalt: isHaltState,
		isPaused: isPausedState,
		snapshotFragments,
		applyArtifact,
	} = options;

	return (state) => {
		if (isPausedState && isPausedState(state)) {
			return state;
		}

		if (isHaltState(state as TState | THalt)) {
			return state;
		}

		return applyArtifact(
			state as TState,
			snapshotFragments(state as TState)
		);
	};
}

/**
 * Generic stage builder for "after fragments" style hooks.
 * @param options
 * @param options.isHalt
 * @param options.execute
 * @param options.isPaused
 */
export function makeAfterFragmentsStage<
	TState,
	THalt extends Halt<unknown>,
>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	isPaused?: (value: unknown) => value is PipelinePaused<TState>;
	execute: (state: TState) => MaybePromise<TState>;
}): Program<TState | THalt | PipelinePaused<TState>> {
	const { isHalt: isHaltState, isPaused: isPausedState, execute } = options;
	return (state) => {
		if (isPausedState && isPausedState(state)) {
			return state;
		}

		if (isHaltState(state as TState | THalt)) {
			return state;
		}

		return execute(state as TState);
	};
}

/**
 * Commit stage builder.
 * @param options
 * @param options.isHalt
 * @param options.commit
 * @param options.rollbackToHalt
 * @param options.isPaused
 */
export function makeCommitStage<TState, THalt extends Halt<unknown>>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	isPaused?: (value: unknown) => value is PipelinePaused<TState>;
	commit: (state: TState) => MaybePromise<void>;
	rollbackToHalt: (state: TState, error: unknown) => MaybePromise<THalt>;
}): Program<TState | THalt | PipelinePaused<TState>> {
	const {
		isHalt: isHaltState,
		isPaused: isPausedState,
		commit,
		rollbackToHalt,
	} = options;

	const runCommit = (state: TState): MaybePromise<TState | THalt> => {
		const onCommitSuccess = (): TState | THalt => state;
		const onCommitError = (error: unknown): MaybePromise<TState | THalt> =>
			rollbackToHalt(state, error) as MaybePromise<TState | THalt>;

		return maybeTry<TState | THalt>(
			() => maybeThen(commit(state), onCommitSuccess),
			onCommitError
		);
	};

	return (state) => {
		if (isPausedState && isPausedState(state)) {
			return state;
		}

		if (isHaltState(state as TState | THalt)) {
			return state;
		}

		return runCommit(state as TState);
	};
}

/**
 * Simple finalizer that snapshots helpers/diagnostics into state.
 * @param options
 * @param options.isHalt
 * @param options.finalize
 * @param options.isPaused
 */
export function makeFinalizeResultStage<
	TState,
	THalt extends Halt<unknown>,
>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	isPaused?: (value: unknown) => value is PipelinePaused<TState>;
	finalize: (state: TState) => TState;
}): Program<TState | THalt | PipelinePaused<TState>> {
	const { isHalt: isHaltState, isPaused: isPausedState, finalize } = options;
	return (state) => {
		if (isPausedState && isPausedState(state)) {
			return state;
		}

		if (isHaltState(state as TState | THalt)) {
			return state;
		}

		return finalize(state as TState);
	};
}

export function makeHelperStageFactory<
	TState,
	TRunResult,
	TContext,
	TOptions,
	TReporter extends PipelineReporter,
	TUserState,
>(
	config: StageEnv<
		TState,
		TRunResult,
		TContext,
		TOptions,
		TReporter,
		TUserState
	>
) {
	return function makeStage<
		TKind extends HelperKind,
		THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
		TInput,
		TOutput,
	>(
		kind: string,
		spec: HelperStageSpec<
			TState,
			TContext,
			TReporter,
			TKind,
			THelper,
			TInput,
			TOutput
		>
	): Program<TState | Halt<TRunResult> | PipelinePaused<TState>> {
		const {
			pushStep,
			toRollbackContext,
			halt,
			isHalt: isHaltState,
			onHelperRollbackError,
		} = config;

		const invokeHelper =
			spec.invoke ??
			(({
				helper,
				args,
				next,
			}: {
				helper: THelper;
				args: HelperApplyOptions<TContext, TInput, TOutput, TReporter>;
				next: () => MaybePromise<void>;
			}): MaybePromise<void> =>
				helper.apply(args, next) as MaybePromise<void>);

		const registerPipelineRollback =
			(rollbacks: RollbackEntry<THelper>[]) =>
			(helper: THelper, result: unknown) => {
				if (!result || typeof result !== 'object') {
					return;
				}
				if ('rollback' in result) {
					const rollback = (result as { rollback?: PipelineRollback })
						.rollback;
					if (rollback) {
						rollbacks.push({ helper, rollback });
					}
				}
			};

		const toRollbackErrorHandler = () =>
			onHelperRollbackError
				? (options: {
						readonly error: unknown;
						readonly helper: THelper;
						readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
						readonly context: TContext;
					}) =>
						onHelperRollbackError({
							...options,
							helper: options.helper as Helper<
								TContext,
								unknown,
								unknown,
								TReporter,
								HelperKind
							>,
						})
				: undefined;

		return (state) => {
			if (isHaltState(state)) {
				return state;
			}
			if (isPaused<TState>(state)) {
				return state;
			}

			// Initialize helper execution snapshot
			let executionMap = (state as unknown as StateWithExecution)
				.helperExecution;

			if (!executionMap) {
				executionMap = new Map();
				(state as unknown as StateWithExecution).helperExecution =
					executionMap;
			}

			let snapshot = executionMap.get(kind);

			if (!snapshot) {
				snapshot = {
					kind,
					executed: [],
					missing: [],
					registered: [], // Registered populated by getOrder result?
				};
				executionMap.set(kind, snapshot);
			}

			const recordStep = (entry: RegisteredHelper<unknown>) => {
				pushStep(entry);
				(snapshot!.executed as string[]).push(
					(entry.helper as HelperWithKey).key
				);
			};

			const rollbacks = [
				...(spec.readRollbacks?.(state as TState) ?? []),
			] as RollbackEntry<THelper>[];

			const rollbackContext = toRollbackContext(state as TState);
			const program = createHelpersProgram<
				TContext,
				TReporter,
				TKind,
				THelper,
				TInput,
				TOutput,
				TState
			>({
				getOrder: spec.getOrder,
				makeArgs: spec.makeArgs,
				invoke: invokeHelper,
				recordStep,
				onVisited: (nextState, visited) =>
					spec.onVisited(nextState, visited, rollbacks),
				registerRollback: registerPipelineRollback(rollbacks),
			});

			const rollbackPlan: HelperRollbackPlan<
				TContext,
				TOptions,
				TUserState,
				THelper
			> = {
				context: rollbackContext.context,
				rollbackContext,
				helperRollbacks: rollbacks,
				onHelperRollbackError: toRollbackErrorHandler(),
			};

			return runHelperStageWithRollback<
				TState,
				TRunResult,
				TContext,
				TOptions,
				TUserState,
				THelper
			>({
				state: state as TState,
				program,
				rollbackPlan,
				halt,
			}) as MaybePromise<TState | Halt<TRunResult>>;
		};
	};
}
