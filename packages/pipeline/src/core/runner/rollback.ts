import { maybeThen, maybeTry, type Program } from '../async-utils';
import { runRollbackStack } from '../rollback';
import type {
	MaybePromise,
	PipelineExtensionRollbackErrorMetadata,
} from '../types';
import type {
	Halt,
	HelperRollbackPlan,
	RollbackContext,
	RollbackEntry,
} from './types';

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

/**
 * Executes a rollback plan for a helper stage failure.
 * It coordinates helper-specific rollbacks and extension rollbacks.
 * @param plan
 * @param error
 */
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

/**
 * Builds a rollback handler that first drains helper rollbacks (when present) and then defers to
 * extension rollback handling.
 * @param state
 * @param helperRollbacks
 * @param onHelperRollbackError
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
