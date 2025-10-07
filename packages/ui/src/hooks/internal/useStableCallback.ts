import { useCallback, useEffect, useRef } from 'react';

/**
 * Store the latest value in a ref, updating it after every render
 *
 * This hook ensures the ref always points to the most recent value,
 * useful for maintaining stable references while accessing current state.
 *
 * @internal
 * @param value - The value to track in a ref
 * @return Mutable ref object containing the current value
 */
function useLatest<T>(value: T): React.MutableRefObject<T> {
	const ref = useRef(value);
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
}

/**
 * Provide a stable function reference whose implementation always sees the latest closure values
 *
 * This hook creates a stable callback that never changes identity but always calls
 * the most recent version of the provided function. Useful for avoiding unnecessary
 * re-renders when passing callbacks to child components while ensuring the callback
 * has access to current props/state.
 *
 * @param fn - The function to stabilize
 * @return Stable callback with the same signature as the input function
 *
 * @example
 * ```tsx
 * const handleClick = useStableCallback(() => {
 *   // Always has access to latest count value
 *   console.log(count);
 * });
 *
 * // handleClick reference never changes, preventing child re-renders
 * <ChildComponent onClick={handleClick} />
 * ```
 */
export function useStableCallback<T extends (...args: never[]) => unknown>(
	fn: T
): (...args: Parameters<T>) => ReturnType<T> {
	const latestRef = useLatest(fn);
	return useCallback(
		(...args: Parameters<T>) => {
			return latestRef.current(...args) as ReturnType<T>;
		},
		[latestRef]
	);
}

export { useLatest };
