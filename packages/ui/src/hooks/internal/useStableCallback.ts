import { useCallback, useEffect, useRef } from 'react';

/**
 * Stores the latest value in a ref, updating it after every render.
 * @param value
 */
function useLatest<T>(value: T): React.MutableRefObject<T> {
	const ref = useRef(value);
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
}

/**
 * Provides a stable function reference whose implementation always sees the latest closure values.
 * @param fn
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
