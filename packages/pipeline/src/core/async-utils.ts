import type { MaybePromise } from './types';

/**
 * Type guard to check if a value is promise-like (has a `.then` method).
 *
 * @param value - The value to check
 * @returns `true` if the value has a `.then` method, `false` otherwise
 *
 * @internal
 */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	if (
		(typeof value !== 'object' || value === null) &&
		typeof value !== 'function'
	) {
		return false;
	}

	return typeof (value as PromiseLike<unknown>).then === 'function';
}

/**
 * Conditionally chains a `.then()` call if the value is promise-like.
 *
 * If the value is a plain value, calls `onFulfilled` synchronously.
 * If the value is a promise, chains `.then()` asynchronously.
 *
 * @param value       - A value that may or may not be a promise
 * @param onFulfilled - The transformation to apply once the value is available
 * @returns Either the synchronous result or a promise of the result
 *
 * @internal
 */
export function maybeThen<T, TResult>(
	value: MaybePromise<T>,
	onFulfilled: (value: T) => MaybePromise<TResult>
): MaybePromise<TResult> {
	if (typeof onFulfilled !== 'function') {
		throw new TypeError('maybeThen: onFulfilled is not a function');
	}

	if (isPromiseLike(value)) {
		return Promise.resolve(value).then(onFulfilled);
	}

	return onFulfilled(value);
}

/**
 * Try-catch wrapper that handles both synchronous and asynchronous errors.
 *
 * If `run()` throws synchronously or returns a rejected promise,
 * calls `onError` with the error.
 *
 * @param run     - The function to execute
 * @param onError - The error handler
 * @returns Either the successful result or the recovery value from `onError`
 *
 * @internal
 */
export function maybeTry<T>(
	run: () => MaybePromise<T>,
	onError: (error: unknown) => MaybePromise<T>
): MaybePromise<T> {
	try {
		const result = run();

		if (isPromiseLike(result)) {
			return Promise.resolve(result).catch((error) => onError(error));
		}

		return result;
	} catch (error) {
		return onError(error);
	}
}

/**
 * Process an array of items sequentially (not in parallel).
 *
 * Handles both synchronous and asynchronous handlers. If a handler returns
 * a promise, waits for it to resolve before processing the next item.
 *
 * @param items     - The array of items to process
 * @param handler   - The function to call for each item
 * @param direction - Whether to process forward (0 → length) or reverse (length → 0)
 * @returns A promise if any handler is async, otherwise `void`
 *
 * @internal
 */
export function processSequentially<T>(
	items: readonly T[],
	handler: (item: T, index: number) => MaybePromise<void>,
	direction: 'forward' | 'reverse' = 'forward'
): MaybePromise<void> {
	const length = items.length;

	if (length === 0) {
		return;
	}

	const shouldContinue = (index: number) =>
		direction === 'forward' ? index < length : index >= 0;
	const advance = (index: number) =>
		direction === 'forward' ? index + 1 : index - 1;

	const iterate = (startIndex: number): MaybePromise<void> => {
		for (
			let index = startIndex;
			shouldContinue(index);
			index = advance(index)
		) {
			const item = items[index]!;
			const result = handler(item, index);

			if (isPromiseLike(result)) {
				return Promise.resolve(result).then(() =>
					iterate(advance(index))
				);
			}
		}
	};

	const start = direction === 'forward' ? 0 : length - 1;

	return iterate(start);
}

/**
 * A small abstraction representing a state transformer that may be async.
 *
 * @internal
 */

export type Program<S> = (state: S) => MaybePromise<S>;
/**
 * Right-to-left composition for {@link Program} functions that short-circuits
 * on promises while preserving synchronous execution when possible.
 *
 * @param {...any} fns
 * @internal
 */

export const composeK =
	<S>(...fns: Program<S>[]): Program<S> =>
	(initial: S) =>
		fns.reduceRight(
			(acc, fn) => maybeThen(acc, fn),
			initial as MaybePromise<S>
		);

/**
 * Sync-friendly Promise.all equivalent.
 *
 * @param values
 * @returns
 *
 * @internal
 */
export function maybeAll<T>(
	values: readonly MaybePromise<T>[]
): MaybePromise<T[]> {
	if (values.some(isPromiseLike)) {
		return Promise.all(values);
	}
	return values as T[];
}
