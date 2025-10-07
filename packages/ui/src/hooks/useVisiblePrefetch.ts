import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useStableCallback, useLatest } from './internal/useStableCallback';

export interface VisiblePrefetchOptions {
	rootMargin?: string;
	once?: boolean;
}

type MarginBox = {
	top: number;
	right: number;
	bottom: number;
	left: number;
};

function parseRootMargin(input: string): MarginBox {
	if (!input) {
		return { top: 0, right: 0, bottom: 0, left: 0 };
	}

	const tokens = input.trim().split(/\s+/).filter(Boolean);

	const values = tokens.length === 0 ? ['0px'] : tokens;
	const toPx = (token: string): number => {
		const match = token.match(/(-?\d+(\.\d+)?)/);
		if (!match) {
			return 0;
		}
		const value = match[1];
		if (value === undefined) {
			return 0;
		}
		const parsed = Number.parseFloat(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	};

	const [top, right, bottom, left] = [
		toPx(values[0] ?? '0px'),
		toPx(values[1] ?? values[0] ?? '0px'),
		toPx(values[2] ?? values[0] ?? '0px'),
		toPx(values[3] ?? values[1] ?? values[0] ?? '0px'),
	];

	return { top, right, bottom, left };
}

function isVisibleWithinMargin(element: Element, margin: MarginBox): boolean {
	const rect = element.getBoundingClientRect();
	const viewportHeight =
		window.innerHeight || document.documentElement.clientHeight || 0;
	const viewportWidth =
		window.innerWidth || document.documentElement.clientWidth || 0;

	const expandedTop = 0 - margin.top;
	const expandedLeft = 0 - margin.left;
	const expandedBottom = viewportHeight + margin.bottom;
	const expandedRight = viewportWidth + margin.right;

	return (
		rect.bottom >= expandedTop &&
		rect.top <= expandedBottom &&
		rect.right >= expandedLeft &&
		rect.left <= expandedRight
	);
}

export function useVisiblePrefetch(
	ref: RefObject<Element>,
	fn: () => void,
	options: VisiblePrefetchOptions = {}
): void {
	const { once = true } = options;
	const rootMarginValue = options.rootMargin ?? '200px';
	const marginBox = useMemo(
		() => parseRootMargin(rootMarginValue),
		[rootMarginValue]
	);
	const fnRef = useStableCallback(fn);
	const onceRef = useLatest(once);
	const hasTriggeredRef = useRef(false);

	useEffect(() => {
		hasTriggeredRef.current = false;
	}, [once]);

	useEffect(() => {
		const target = ref.current;
		if (!target || typeof window === 'undefined') {
			return undefined;
		}

		let observer: IntersectionObserver | null = null;
		let rafId: number | null = null;

		const trigger = () => {
			if (onceRef.current && hasTriggeredRef.current) {
				return;
			}
			hasTriggeredRef.current = true;
			fnRef();
		};

		const cleanupFallback = () => {
			if (rafId !== null) {
				window.cancelAnimationFrame(rafId);
				rafId = null;
			}
			window.removeEventListener('scroll', scheduleCheck, true);
			window.removeEventListener('resize', scheduleCheck, true);
		};

		const handleIntersect: IntersectionObserverCallback = (entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					trigger();
					if (onceRef.current && observer) {
						observer.disconnect();
						cleanupFallback();
					}
					break;
				}
			}
		};

		const scheduleCheck = () => {
			if (rafId !== null) {
				return;
			}
			rafId = window.requestAnimationFrame(() => {
				rafId = null;
				if (isVisibleWithinMargin(target, marginBox)) {
					trigger();
					if (onceRef.current) {
						window.removeEventListener(
							'scroll',
							scheduleCheck,
							true
						);
						window.removeEventListener(
							'resize',
							scheduleCheck,
							true
						);
					}
				}
			});
		};

		if (typeof window.IntersectionObserver === 'function') {
			observer = new IntersectionObserver(handleIntersect, {
				rootMargin: rootMarginValue,
			});
			observer.observe(target);
		} else {
			window.addEventListener('scroll', scheduleCheck, true);
			window.addEventListener('resize', scheduleCheck, true);
			scheduleCheck();
		}

		return () => {
			if (observer) {
				observer.disconnect();
			}
			cleanupFallback();
		};
	}, [fnRef, marginBox, onceRef, ref, rootMarginValue]);
}
