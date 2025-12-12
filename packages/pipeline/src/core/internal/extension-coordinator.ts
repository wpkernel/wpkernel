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
export function initExtensionCoordinator<TContext, TOptions, TArtifact>(
	onRollbackError: (
		event: ExtensionRollbackEvent<TContext, TOptions, TArtifact>
	) => void
): ExtensionCoordinator<TContext, TOptions, TArtifact> {
	const runLifecycle: ExtensionCoordinator<
		TContext,
		TOptions,
		TArtifact
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
					TArtifact
				>
		);
	};

	const createRollbackHandler: ExtensionCoordinator<
		TContext,
		TOptions,
		TArtifact
	>['createRollbackHandler'] =
		<TResult>(
			state: ExtensionLifecycleState<TContext, TOptions, TArtifact>
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
		TArtifact
	>['commit'] = (state) => commitExtensionResults(state.results);

	return {
		runLifecycle,
		createRollbackHandler,
		commit,
		handleRollbackError: onRollbackError,
	} satisfies ExtensionCoordinator<TContext, TOptions, TArtifact>;
}

export type {
	ExtensionLifecycleState,
	ExtensionHookEntry,
} from './extension-coordinator.types';
