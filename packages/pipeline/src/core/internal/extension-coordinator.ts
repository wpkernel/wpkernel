import {
	commitExtensionResults,
	rollbackExtensionResults,
	runExtensionHooks,
} from '../extensions';
import { createRollbackErrorMetadata } from '../rollback';
import { maybeThen } from '../async-utils';
import type {
	ExtensionCoordinator,
	ExtensionLifecycleState,
	ExtensionRollbackEvent,
} from './extension-coordinator.types';
import type { MaybePromise } from '../types';

/**
 * Builds an {@link ExtensionCoordinator} tailored to the provided rollback handler.
 *
 * @param    onRollbackError
 * @example
 * ```ts
 * const coordinator = initExtensionCoordinator(({ error }) => console.warn(error));
 * const state = await coordinator.runLifecycle('after-fragments', {
 *   hooks,
 *   options: hookOptions,
 * });
 * await coordinator.commit(state);
 * ```
 *
 * @category Pipeline
 * @internal
 */
export function initExtensionCoordinator<TContext, TOptions, TUserState>(
	onRollbackError: (
		event: ExtensionRollbackEvent<TContext, TOptions, TUserState>
	) => void
): ExtensionCoordinator<TContext, TOptions, TUserState> {
	const runLifecycle: ExtensionCoordinator<
		TContext,
		TOptions,
		TUserState
	>['runLifecycle'] = (lifecycle, { hooks, hookOptions }) => {
		const lifecycleHooks = hooks.filter(
			(entry) => entry.lifecycle === lifecycle
		);

		const executed = runExtensionHooks(
			hooks,
			lifecycle,
			hookOptions,
			({ error, extensionKeys, hookSequence }) =>
				onRollbackError({
					error,
					extensionKeys,
					hookSequence,
					errorMetadata: createRollbackErrorMetadata(error),
					hookOptions,
				})
		);

		return maybeThen(
			executed,
			(result) =>
				({
					artifact: result.artifact,
					results: result.results,
					hooks: lifecycleHooks,
				}) satisfies ExtensionLifecycleState<
					TContext,
					TOptions,
					TUserState
				>
		);
	};

	const createRollbackHandler: ExtensionCoordinator<
		TContext,
		TOptions,
		TUserState
	>['createRollbackHandler'] =
		<TResult>(
			state: ExtensionLifecycleState<TContext, TOptions, TUserState>
		) =>
		(error: unknown): MaybePromise<TResult> =>
			maybeThen(
				rollbackExtensionResults(
					state.results,
					state.hooks,
					({ error: rollbackError, extensionKeys, hookSequence }) =>
						onRollbackError({
							error: rollbackError,
							extensionKeys,
							hookSequence,
							errorMetadata:
								createRollbackErrorMetadata(rollbackError),
							hookOptions: undefined,
						})
				),
				() => {
					throw error;
				}
			);

	const commit: ExtensionCoordinator<
		TContext,
		TOptions,
		TUserState
	>['commit'] = (state) => commitExtensionResults(state.results);

	return {
		runLifecycle,
		createRollbackHandler,
		commit,
		handleRollbackError: onRollbackError,
	} satisfies ExtensionCoordinator<TContext, TOptions, TUserState>;
}

export type {
	ExtensionLifecycleState,
	ExtensionHookEntry,
} from './extension-coordinator.types';
