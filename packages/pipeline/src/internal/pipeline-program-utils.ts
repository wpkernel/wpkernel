import { isPromiseLike, maybeThen, maybeTry } from '../async-utils.js';
import { executeHelpers } from '../executor.js';
import { runRollbackStack, type PipelineRollback } from '../rollback.js';
import type {
	Helper,
	HelperApplyOptions,
	HelperKind,
	MaybePromise,
	PipelineExtensionRollbackErrorMetadata,
	PipelineReporter,
} from '../types';
import type { RegisteredHelper } from '../dependency-graph';
import type { Program } from '../async-utils.js';
import {
	type HelperInvokeOptions,
	type RollbackContext,
	type Halt,
	type RollbackEntry,
	type HelperRollbackPlan,
	type StageEnv,
} from './pipeline-runner.types.js';

export function isHalt<TRunResult>(value: unknown): value is Halt<TRunResult> {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'__halt' in value &&
			(value as { __halt?: unknown }).__halt === true
	);
}

/**
 * Builds a rollback handler that first drains helper rollbacks (when present) and then defers to
 * extension rollback handling.
 *
 * @param state
 * @param state.context
 * @param state.extensionCoordinator
 * @param state.extensionState
 * @param helperRollbacks
 * @param onHelperRollbackError
 * @internal
 */
export function makeRollbackHandler<
	TContext,
	TOptions,
	TArtifact,
	THelper extends { key: string },
>(
	state: RollbackContext<TContext, TOptions, TArtifact>,
	helperRollbacks: RollbackEntry<THelper>[],
	onHelperRollbackError?: (options: {
		readonly error: unknown;
		readonly helper: THelper;
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void
) {
	return (error: unknown): MaybePromise<void> =>
		runHelperRollbackPlan<TContext, TOptions, TArtifact, THelper>(
			{
				context: state.context,
				rollbackContext: state,
				helperRollbacks,
				onHelperRollbackError,
			},
			error
		);
}

/**
 * Generic stage constructor that executes an ordered helper list with middleware-style `next()`.
 * Optional rollback capture keeps fragment/builder programs declarative by passing in only the
 * stage-specific arg factories and completion logic.
 *
 * @param options
 * @param options.getOrder
 * @param options.makeArgs
 * @param options.invoke
 * @param options.recordStep
 * @param options.onVisited
 * @param options.registerRollback
 * @internal
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
 * Pure finalizer for fragment state that can be composed into a pipeline without knowing the
 * concrete runner shape. Callers supply how to detect halts, how to snapshot fragment execution,
 * and how to apply the finalized artifact back onto state.
 * @param options
 * @param options.isHalt
 * @param options.snapshotFragments
 * @param options.applyArtifact
 */
export function makeFinalizeFragmentsStage<
	TState,
	THalt extends Halt<unknown>,
	TFragments,
>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	snapshotFragments: (state: TState) => TFragments;
	applyArtifact: (state: TState, fragments: TFragments) => TState;
}): Program<TState | THalt> {
	const { isHalt: isHaltState, snapshotFragments, applyArtifact } = options;

	return (state) =>
		isHaltState(state)
			? state
			: applyArtifact(state, snapshotFragments(state));
}

/**
 * Generic stage builder for "after fragments" style hooks. The runner provides the execution logic
 * (e.g. extension coordinator runLifecycle) and a halt predicate; the program simply short-circuits
 * on halts and applies the provided execution otherwise.
 * @param options
 * @param options.isHalt
 * @param options.execute
 */
export function makeAfterFragmentsStage<
	TState,
	THalt extends Halt<unknown>,
>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	execute: (state: TState) => MaybePromise<TState>;
}): Program<TState | THalt> {
	const { isHalt: isHaltState, execute } = options;
	return (state) => (isHaltState(state) ? state : execute(state));
}

/**
 * Commit stage builder that keeps the runner point-free: supply how to commit extensions and how to
 * roll back with a halt sentinel, and the program handles sync/async errors uniformly.
 * @param options
 * @param options.isHalt
 * @param options.commit
 * @param options.rollbackToHalt
 */
export function makeCommitStage<TState, THalt extends Halt<unknown>>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	commit: (state: TState) => MaybePromise<void>;
	rollbackToHalt: (state: TState, error: unknown) => MaybePromise<THalt>;
}): Program<TState | THalt> {
	const { isHalt: isHaltState, commit, rollbackToHalt } = options;

	const runCommit = (state: TState): MaybePromise<TState | THalt> => {
		const onCommitSuccess = (): TState | THalt => state;
		const onCommitError = (error: unknown): MaybePromise<TState | THalt> =>
			rollbackToHalt(state, error) as MaybePromise<TState | THalt>;

		return maybeTry<TState | THalt>(
			() => maybeThen(commit(state), onCommitSuccess),
			onCommitError
		);
	};

	return (state) => (isHaltState(state) ? state : runCommit(state as TState));
}

/**
 * Simple finalizer that snapshots helpers/diagnostics into state unless a halt is present.
 * @param options
 * @param options.isHalt
 * @param options.finalize
 */
export function makeFinalizeResultStage<
	TState,
	THalt extends Halt<unknown>,
>(options: {
	isHalt: (value: TState | THalt) => value is THalt;
	finalize: (state: TState) => TState;
}): Program<TState | THalt> {
	const { isHalt: isHaltState, finalize } = options;
	return (state) => (isHaltState(state) ? state : finalize(state));
}
export type HelperStageSpec<
	TState,
	TContext,
	TReporter extends PipelineReporter,
	TKind extends HelperKind,
	THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
	TInput,
	TOutput,
> = {
	readonly getOrder: (state: TState) => RegisteredHelper<THelper>[];
	readonly makeArgs: (
		state: TState
	) => (
		entry: RegisteredHelper<THelper>
	) => HelperApplyOptions<TContext, TInput, TOutput, TReporter>;
	readonly onVisited: (
		state: TState,
		visited: Set<string>,
		rollbacks: RollbackEntry<THelper>[]
	) => TState;
	readonly readRollbacks?: (
		state: TState
	) => RollbackEntry<THelper>[] | undefined;
};

export function runHelperRollbackPlan<
	TContext,
	TOptions,
	TArtifact,
	THelper extends { key: string },
>(
	plan: HelperRollbackPlan<TContext, TOptions, TArtifact, THelper>,
	error: unknown
): MaybePromise<void> {
	const { context, rollbackContext, helperRollbacks, onHelperRollbackError } =
		plan;

	// Build list of handlers to run (LIFO for stack, fallback to singular)
	const handlers = (rollbackContext.extensionStack ?? []).map(
		({ coordinator, state }) =>
			coordinator.createRollbackHandler<void>(state)
	);

	if (
		handlers.length === 0 &&
		rollbackContext.extensionCoordinator &&
		rollbackContext.extensionState
	) {
		handlers.push(
			rollbackContext.extensionCoordinator.createRollbackHandler<void>(
				rollbackContext.extensionState
			)
		);
	}

	const extensionHandler = (rollbackError: unknown): MaybePromise<void> => {
		if (handlers.length === 0) {
			throw rollbackError;
		}

		// Run handlers in reverse order (LIFO)
		const runRemaining = (index: number): MaybePromise<void> => {
			if (index < 0) {
				return;
			}
			const handler = handlers[index]!;
			const next = () => runRemaining(index - 1);
			// Handlers are expected to re-throw the rollback error, but we must continue
			// to the next handler in the stack regardless of success or failure.
			return maybeTry(
				() => maybeThen(handler(rollbackError), next),
				next
			);
		};

		return runRemaining(handlers.length - 1);
	};

	const runHelperRollbacks = (): MaybePromise<void> =>
		maybeThen(
			runRollbackStack(
				helperRollbacks.map((entry: RollbackEntry<THelper>) => ({
					...entry.rollback,
					key: entry.helper.key,
				})),
				{
					source: 'helper',
					onError: ({
						error: rbError,
						metadata,
						entry,
					}: {
						error: unknown;
						metadata: PipelineExtensionRollbackErrorMetadata;
						entry: { key?: string };
					}) => {
						const helperEntry = helperRollbacks.find(
							(candidate: RollbackEntry<THelper>) =>
								candidate.helper.key === (entry.key ?? '')
						);
						if (helperEntry && onHelperRollbackError) {
							onHelperRollbackError({
								error: rbError,
								helper: helperEntry.helper,
								errorMetadata: metadata,
								context,
							});
						}
					},
				}
			),
			() => extensionHandler(error)
		);

	const swallowRollbackFailure = () => undefined;

	return maybeTry(runHelperRollbacks, swallowRollbackFailure);
}

export type HelperStageRunPlan<
	TState,
	TRunResult,
	TContext,
	TOptions,
	TArtifact,
	THelper extends { key: string },
> = {
	readonly state: TState;
	readonly program: Program<TState>;
	readonly rollbackPlan: HelperRollbackPlan<
		TContext,
		TOptions,
		TArtifact,
		THelper
	>;
	readonly halt: (error?: unknown) => Halt<TRunResult>;
};

export function runHelperStageWithRollback<
	TState,
	TRunResult,
	TContext,
	TOptions,
	TArtifact,
	THelper extends { key: string },
>(
	plan: HelperStageRunPlan<
		TState,
		TRunResult,
		TContext,
		TOptions,
		TArtifact,
		THelper
	>
): MaybePromise<TState | Halt<TRunResult>> {
	const { state, program, rollbackPlan, halt } = plan;

	const runProgram = () => program(state);

	const handleError = (
		error: unknown
	): MaybePromise<TState | Halt<TRunResult>> =>
		runRollbackToHalt<TRunResult, TContext, TOptions, TArtifact, THelper>(
			{
				rollbackPlan,
				halt,
			},
			error
		);

	return maybeTry<TState | Halt<TRunResult>>(runProgram, handleError);
}

export type RollbackToHaltPlan<
	TRunResult,
	TContext,
	TOptions,
	TArtifact,
	THelper extends { key: string },
> = {
	readonly rollbackPlan: HelperRollbackPlan<
		TContext,
		TOptions,
		TArtifact,
		THelper
	>;
	readonly halt: (error?: unknown) => Halt<TRunResult>;
};

export function runRollbackToHalt<
	TRunResult,
	TContext,
	TOptions,
	TArtifact,
	THelper extends { key: string },
>(
	plan: RollbackToHaltPlan<
		TRunResult,
		TContext,
		TOptions,
		TArtifact,
		THelper
	>,
	error: unknown
): MaybePromise<Halt<TRunResult>> {
	return maybeThen(runHelperRollbackPlan(plan.rollbackPlan, error), () =>
		plan.halt(error)
	);
}

export function makeHelperStageFactory<
	TState,
	TRunResult,
	TContext,
	TOptions,
	TArtifact,
	TReporter extends PipelineReporter,
>(
	config: StageEnv<
		TState,
		TRunResult,
		TContext,
		TOptions,
		TArtifact,
		TReporter
	>
) {
	return function makeStage<
		TKind extends HelperKind,
		THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
		TInput,
		TOutput,
	>(
		spec: HelperStageSpec<
			TState,
			TContext,
			TReporter,
			TKind,
			THelper,
			TInput,
			TOutput
		>
	): Program<TState | Halt<TRunResult>> {
		const {
			pushStep,
			toRollbackContext,
			halt,
			isHalt: isHaltState,
			onHelperRollbackError,
		} = config;

		const invokeHelper = ({
			helper,
			args,
			next,
		}: {
			helper: THelper;
			args: HelperApplyOptions<TContext, TInput, TOutput, TReporter>;
			next: () => MaybePromise<void>;
		}): MaybePromise<void> =>
			helper.apply(args, next) as MaybePromise<void>;

		const recordStep = (entry: RegisteredHelper<unknown>) =>
			pushStep(entry);

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

			const rollbacks = [
				...(spec.readRollbacks?.(state) ?? []),
			] as RollbackEntry<THelper>[];

			const rollbackContext = toRollbackContext(state);
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
				TArtifact,
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
				TArtifact,
				THelper
			>({
				state,
				program,
				rollbackPlan,
				halt,
			});
		};
	};
}
