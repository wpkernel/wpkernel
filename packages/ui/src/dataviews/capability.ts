import { useMemo } from 'react';
import type { DataViewsRuntimeContext } from './types';

type CapabilityDecision =
	| { allowed: true; reason?: 'runtime-missing' }
	| { allowed: false; reason: 'denied' | 'error'; error?: unknown };

/**
 * Lightweight capability helper for UI components.
 * @param runtime
 * @param key
 */
export function useCapability(
	runtime: DataViewsRuntimeContext | undefined,
	key: string | undefined
): CapabilityDecision {
	return useMemo(() => {
		if (!key) {
			return { allowed: true };
		}

		const capabilityRuntime = runtime?.capabilities?.capability;
		if (!capabilityRuntime || typeof capabilityRuntime.can !== 'function') {
			return { allowed: true, reason: 'runtime-missing' };
		}

		try {
			const result = capabilityRuntime.can(key, undefined as unknown);
			if (result instanceof Promise) {
				return { allowed: true };
			}
			return result
				? { allowed: true }
				: { allowed: false, reason: 'denied' };
		} catch (error) {
			return { allowed: false, reason: 'error', error };
		}
	}, [runtime, key]);
}

export function useCapabilityGuard<
	TConfig extends { capability?: string; disabled?: boolean },
>(
	runtime: DataViewsRuntimeContext | undefined,
	config: TConfig
): TConfig & { disabled?: boolean } {
	const decision = useCapability(runtime, config.capability);
	return {
		...config,
		disabled:
			config.disabled ??
			(!decision.allowed && decision.reason === 'denied'),
	};
}
