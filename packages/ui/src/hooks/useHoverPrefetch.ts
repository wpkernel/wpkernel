import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useStableCallback, useLatest } from './internal/useStableCallback';

export interface HoverPrefetchOptions {
	delayMs?: number;
	once?: boolean;
}

export function useHoverPrefetch(
	ref: RefObject<HTMLElement>,
	fn: () => void,
	options: HoverPrefetchOptions = {}
): void {
	const { delayMs = 150, once = true } = options;
	const fnRef = useStableCallback(fn);
	const onceRef = useLatest(once);
	const hasTriggeredRef = useRef(false);

	useEffect(() => {
		hasTriggeredRef.current = false;
	}, [once]);

	useEffect(() => {
		const element = ref.current;
		if (!element || typeof window === 'undefined') {
			return undefined;
		}

		let timeoutId: number | null = null;

		const cancel = () => {
			if (timeoutId !== null) {
				window.clearTimeout(timeoutId);
				timeoutId = null;
			}
		};

		const trigger = () => {
			if (onceRef.current && hasTriggeredRef.current) {
				return;
			}
			hasTriggeredRef.current = true;
			fnRef();
		};

		const handleEnter = () => {
			if (timeoutId !== null) {
				return;
			}
			if (onceRef.current && hasTriggeredRef.current) {
				return;
			}
			timeoutId = window.setTimeout(() => {
				timeoutId = null;
				trigger();
			}, delayMs);
		};

		const handleCancel = () => {
			cancel();
		};

		element.addEventListener('mouseenter', handleEnter);
		element.addEventListener('mouseleave', handleCancel);
		element.addEventListener('click', handleCancel);

		return () => {
			cancel();
			element.removeEventListener('mouseenter', handleEnter);
			element.removeEventListener('mouseleave', handleCancel);
			element.removeEventListener('click', handleCancel);
		};
	}, [delayMs, fnRef, onceRef, ref]);
}
