import { isPromiseLike, maybeTry } from './async-utils.js';
import type { MaybePromise } from './types.js';

/**
 * Metadata about an error during rollback execution.
 * @public
 */
export interface PipelineRollbackErrorMetadata {
	readonly name?: string;
	readonly message?: string;
	readonly stack?: string;
	readonly cause?: unknown;
}

/**
 * A rollback operation that can be executed to undo changes.
 *
 * Rollbacks are collected during helper/extension execution and invoked in reverse order
 * if the pipeline encounters a failure, enabling cleanup and state restoration.
 *
 * @public
 */
export interface PipelineRollback {
	readonly key?: string;
	readonly label?: string;
	readonly run: () => unknown | Promise<unknown>;
}

/**
 * Options for executing a rollback stack.
 * @public
 */
export interface RunRollbackStackOptions {
	readonly source: 'extension' | 'helper';
	readonly onError?: (args: {
		readonly error: unknown;
		readonly entry: PipelineRollback;
		readonly metadata: PipelineRollbackErrorMetadata;
	}) => void;
}

/**
 * Creates a pipeline rollback object with metadata.
 *
 * This is a lightweight wrapper that helps distinguish rollback operations in diagnostics
 * and error handling. It's used by both helpers and extensions to declare cleanup functions.
 *
 * @param run           - The rollback function to execute
 * @param options       - Optional metadata (key, label) for diagnostics
 * @param options.key
 * @param options.label
 * @returns A rollback descriptor with the run function and metadata
 *
 * @example
 * ```typescript
 * const rollback = createPipelineRollback(
 *   () => {
 *     cleanup();
 *   },
 *   {
 *     key: 'my-helper',
 *     label: 'Restore previous state',
 *   }
 * );
 * ```
 *
 * @public
 */
export function createPipelineRollback(
	run: () => unknown | Promise<unknown>,
	options: {
		readonly key?: string;
		readonly label?: string;
	} = {}
): PipelineRollback {
	return { run, ...options };
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
export function createRollbackErrorMetadata(
	error: unknown
): PipelineRollbackErrorMetadata {
	if (error instanceof Error) {
		const { name, message, stack } = error;
		const cause = (error as Error & { cause?: unknown }).cause;

		return {
			name,
			message,
			stack,
			cause,
		};
	}

	if (typeof error === 'string') {
		return {
			message: error,
		};
	}

	return {};
}

/**
 * Executes a stack of rollback operations in reverse order.
 *
 * Each rollback is executed sequentially in reverse (LIFO) order. If any rollback fails,
 * the error is reported via the onError callback but execution continues with remaining
 * rollbacks. This ensures all cleanup functions are attempted even if some fail.
 *
 * @param entries - The rollback entries to execute in reverse order
 * @param options - Configuration including error handler and rollback source
 * @returns A promise if any rollback is async, otherwise `void`
 *
 * @internal
 */
export function runRollbackStack(
	entries: readonly PipelineRollback[],
	options: RunRollbackStackOptions
): MaybePromise<void> {
	const reversed = [...entries].reverse();

	const runAt = (currentIndex: number): MaybePromise<void> => {
		if (currentIndex >= reversed.length) {
			return;
		}

		const entry = reversed[currentIndex]!;

		const rollbackResult = maybeTry(
			() => entry.run(),
			(error) => {
				const metadata = createRollbackErrorMetadata(error);

				options.onError?.({
					error,
					entry,
					metadata,
				});

				return undefined;
			}
		);

		if (isPromiseLike(rollbackResult)) {
			return Promise.resolve(rollbackResult).then(() =>
				runAt(currentIndex + 1)
			);
		}

		return runAt(currentIndex + 1);
	};

	const result = runAt(0);

	if (isPromiseLike(result)) {
		return Promise.resolve(result).then(() => undefined);
	}

	return undefined;
}
