import type {
	MaybePromise,
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
	PipelineExtensionLifecycle,
} from './types';
import {
	isPromiseLike,
	maybeThen,
	maybeTry,
	processSequentially,
} from './async-utils';
import { runRollbackStack } from './rollback.js';

/**
 * An extension hook entry with its unique key.
 *
 * @internal
 */
export interface ExtensionHookEntry<TContext, TOptions, TArtifact> {
	readonly key: string;
	readonly lifecycle: PipelineExtensionLifecycle;
	readonly hook: PipelineExtensionHook<TContext, TOptions, TArtifact>;
}

/**
 * The result of executing an extension hook.
 *
 * @internal
 */
export interface ExtensionHookExecution<TContext, TOptions, TArtifact> {
	readonly hook: ExtensionHookEntry<TContext, TOptions, TArtifact>;
	readonly result: PipelineExtensionHookResult<TArtifact>;
}

/**
 * Arguments passed to the rollback error handler.
 *
 * @internal
 */
export interface RollbackErrorArgs {
	readonly error: unknown;
	readonly extensionKeys: readonly string[];
	readonly hookSequence: readonly string[];
}

/**
 * Converts an error into a serializable metadata object.
 *
 * Extracts `name`, `message`, `stack`, and `cause` from Error instances.
 * Falls back to a plain message string for non-Error values.
 *
 * @param error - The error to convert
 * @returns Serializable error metadata
 *
 * @internal
 */
// createRollbackErrorMetadata moved to ./rollback.js to avoid circular exports and duplication

/**
 * Runs extension hooks sequentially and accumulates their results.
 *
 * Each hook can optionally transform the artifact and return commit/rollback functions.
 * If any hook throws, automatically rolls back all previously executed hooks in reverse order.
 *
 * @param hooks           - The extension hooks to run
 * @param lifecycle
 * @param options         - Context, options, and initial artifact
 * @param onRollbackError - Callback invoked if a rollback itself fails
 * @returns The final artifact and all hook execution results
 *
 * @internal
 */
export function runExtensionHooks<TContext, TOptions, TArtifact>(
	hooks: readonly ExtensionHookEntry<TContext, TOptions, TArtifact>[],
	lifecycle: PipelineExtensionLifecycle,
	options: PipelineExtensionHookOptions<TContext, TOptions, TArtifact>,
	onRollbackError: (args: RollbackErrorArgs) => void
): MaybePromise<{
	artifact: TArtifact;
	results: ExtensionHookExecution<TContext, TOptions, TArtifact>[];
}> {
	let artifact = options.artifact;
	const results: ExtensionHookExecution<TContext, TOptions, TArtifact>[] = [];
	const lifecycleHooks = hooks.filter(
		(entry) => entry.lifecycle === lifecycle
	);
	const baseOptions = {
		context: options.context,
		options: options.options,
		lifecycle,
	} as const;

	const process = () =>
		processSequentially(lifecycleHooks, (entry) => {
			const hookResult = entry.hook({
				...baseOptions,
				artifact,
			});

			if (isPromiseLike(hookResult)) {
				return Promise.resolve(hookResult).then((resolved) => {
					if (!resolved) {
						return undefined;
					}

					if (resolved.artifact !== undefined) {
						artifact = resolved.artifact;
					}

					results.push({
						hook: entry,
						result: resolved,
					});

					return undefined;
				});
			}

			if (!hookResult) {
				return undefined;
			}

			if (hookResult.artifact !== undefined) {
				artifact = hookResult.artifact;
			}

			return void results.push({
				hook: entry,
				result: hookResult,
			});
		});

	const processed = maybeTry(process, (error) =>
		maybeThen(
			rollbackExtensionResults(results, lifecycleHooks, onRollbackError),
			() => {
				throw error;
			}
		)
	);

	return maybeThen(processed, () => ({ artifact, results }));
}

/**
 * Commits all extension hook results by invoking their commit functions.
 *
 * Processes commits sequentially in the order hooks were executed.
 *
 * @param results - The hook execution results
 * @returns A promise if any commit is async, otherwise `void`
 *
 * @internal
 */
export function commitExtensionResults<TContext, TOptions, TArtifact>(
	results: readonly ExtensionHookExecution<TContext, TOptions, TArtifact>[]
): MaybePromise<void> {
	return processSequentially(results, (execution) => {
		const commit = execution.result.commit;
		if (!commit) {
			return undefined;
		}

		const commitResult = commit();
		if (isPromiseLike(commitResult)) {
			return commitResult.then(() => undefined);
		}

		return undefined;
	});
}

/**
 * Rolls back extension hook results by invoking their rollback functions in reverse order.
 *
 * If a rollback itself fails, calls `onRollbackError` but continues rolling back remaining hooks.
 *
 * @param results         - The hook execution results to roll back
 * @param hooks           - The original hook entries (for error context)
 * @param onRollbackError - Callback invoked if a rollback fails
 * @returns A promise if any rollback is async, otherwise `void`
 *
 * @internal
 */
export function rollbackExtensionResults<TContext, TOptions, TArtifact>(
	results: readonly ExtensionHookExecution<TContext, TOptions, TArtifact>[],
	hooks: readonly ExtensionHookEntry<TContext, TOptions, TArtifact>[],
	onRollbackError: (args: RollbackErrorArgs) => void
): MaybePromise<void> {
	const hookKeys = hooks.map((entry) => entry.key);
	const hookSequence = hookKeys;

	// Convert extension hook results to PipelineRollback entries
	const rollbackEntries = results
		.map((execution) => ({
			result: execution.result,
			hook: execution.hook,
		}))
		.filter((entry) => entry.result.rollback)
		.map((entry) => ({
			key: entry.hook.key,
			run: entry.result.rollback!,
		}));

	return runRollbackStack(rollbackEntries, {
		source: 'extension',
		onError: ({ error }) => {
			onRollbackError({
				error,
				extensionKeys: hookKeys,
				hookSequence,
			});
		},
	});
}

export { OFFICIAL_EXTENSION_BLUEPRINTS } from './extensions/official.js';
export type {
	OfficialExtensionBlueprint,
	ExtensionBlueprint,
	ExtensionBehaviour,
	ExtensionFactorySignature,
} from './extensions/official.js';
