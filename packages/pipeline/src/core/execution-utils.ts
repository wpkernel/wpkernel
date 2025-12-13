import type {
	Helper,
	HelperApplyOptions,
	HelperKind,
	MaybePromise,
	PipelineReporter,
} from './types';
import type { RegisteredHelper } from './dependency-graph';
import { isPromiseLike } from './async-utils';

/**
 * Executes an ordered list of helpers sequentially with middleware-style `next()` support.
 *
 * Each helper can optionally call `next()` to explicitly control when the next helper runs.
 * If a helper doesn't call `next()`, execution continues automatically after the helper completes
 * (for async helpers, after the promise resolves).
 *
 * This enables middleware patterns where helpers can:
 * - Pre-process before calling next()
 * - Post-process after next() returns
 * - Control timing of downstream execution via explicit next() calls
 *
 * @param ordered    - Topologically sorted helpers to execute
 * @param makeArgs   - Factory function to create arguments for each helper
 * @param invoke     - Function that invokes a helper with its arguments and next callback
 * @param recordStep - Callback invoked when a helper starts executing (for diagnostics)
 * @returns Set of visited helper IDs
 *
 * @internal
 */
export function executeHelpers<
	TContext,
	TInput,
	TOutput,
	TReporter extends PipelineReporter,
	TKind extends HelperKind,
	THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
	TArgs extends HelperApplyOptions<TContext, TInput, TOutput, TReporter>,
>(
	ordered: RegisteredHelper<THelper>[],
	makeArgs: (entry: RegisteredHelper<THelper>) => TArgs,
	invoke: (
		helper: THelper,
		args: TArgs,
		next: () => MaybePromise<void>
	) => MaybePromise<void>,
	recordStep: (entry: RegisteredHelper<THelper>) => void
): MaybePromise<Set<string>> {
	const visited = new Set<string>();

	function runAtAsync(index: number): Promise<void> {
		const continuation = runAt(index);
		if (isPromiseLike(continuation)) {
			return Promise.resolve(continuation).then(() => undefined);
		}

		return Promise.resolve();
	}

	function runAt(index: number): MaybePromise<void> {
		if (index >= ordered.length) {
			return;
		}

		const entry = ordered[index];
		if (!entry) {
			return runAt(index + 1);
		}

		if (visited.has(entry.id)) {
			return runAt(index + 1);
		}

		visited.add(entry.id);
		recordStep(entry);

		let nextCalled = false;
		let nextResult: MaybePromise<void> | undefined;
		const args = makeArgs(entry);

		const next = (): MaybePromise<void> => {
			if (nextCalled) {
				return nextResult;
			}

			nextCalled = true;
			const continuation = runAt(index + 1);
			nextResult = continuation;
			return continuation;
		};

		const invocation = invoke(entry.helper, args, next);

		if (isPromiseLike(invocation)) {
			return Promise.resolve(invocation).then(() => {
				if (!nextCalled) {
					return runAtAsync(index + 1);
				}

				if (isPromiseLike(nextResult)) {
					return nextResult;
				}

				return undefined;
			});
		}

		if (nextCalled) {
			return nextResult;
		}

		return runAt(index + 1);
	}

	const execution = runAt(0);

	if (isPromiseLike(execution)) {
		return execution.then(() => visited);
	}

	return visited;
}
