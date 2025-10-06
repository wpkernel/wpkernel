import {
	useCallback,
	useEffect,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { KernelError } from '@geekist/wp-kernel/error';
import { createPolicyCacheKey } from '@geekist/wp-kernel/policy';
import type {
	ParamsOf,
	PolicyHelpers,
	UsePolicyResult,
} from '@geekist/wp-kernel/policy';

interface PolicyRuntime {
	policy?: Partial<PolicyHelpers<Record<string, unknown>>> & {
		cache?: PolicyHelpers<Record<string, unknown>>['cache'];
	};
}

type PolicyLike<K extends Record<string, unknown>> =
	| PolicyHelpers<K>
	| (Partial<PolicyHelpers<K>> & { cache?: PolicyHelpers<K>['cache'] });

function getPolicyRuntime(): PolicyRuntime | undefined {
	return (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: PolicyRuntime })
		.__WP_KERNEL_ACTION_RUNTIME__;
}

function isPromise(value: unknown): value is Promise<unknown> {
	return typeof value === 'object' && value !== null && 'then' in value;
}

function resolvePolicy<K extends Record<string, unknown>>():
	| PolicyLike<K>
	| undefined {
	const runtime = getPolicyRuntime();
	return runtime?.policy as PolicyLike<K> | undefined;
}

/**
 * React hook for policy evaluation in UI components.
 */
export function usePolicy<
	K extends Record<string, unknown>,
>(): UsePolicyResult<K> {
	const policy = resolvePolicy<K>();
	const cache = policy?.cache;

	const subscribe = useCallback(
		(listener: () => void) =>
			cache?.subscribe(listener) ?? (() => undefined),
		[cache]
	);
	const getSnapshot = useCallback(() => cache?.getSnapshot() ?? 0, [cache]);
	useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const [hydrated, setHydrated] = useState(false);
	const [error, setError] = useState<Error | undefined>(undefined);

	useEffect(() => {
		if (!policy?.can) {
			setError(
				new KernelError('DeveloperError', {
					message:
						'No policy runtime configured. Call definePolicy() and wire it into the action runtime.',
				})
			);
		} else {
			setError(undefined);
		}
		setHydrated(true);
	}, [policy]);

	const can = useCallback(
		<Key extends keyof K>(
			key: Key,
			...params: ParamsOf<K, Key>
		): boolean => {
			if (!hydrated || !policy?.can) {
				return false;
			}

			const param = params[0] as ParamsOf<K, Key>[0] | undefined;
			const cacheKey = createPolicyCacheKey(String(key), param);
			const cached = cache?.get(cacheKey);
			if (typeof cached === 'boolean') {
				return cached;
			}

			try {
				const result = policy.can(key, ...(params as ParamsOf<K, Key>));
				if (isPromise(result)) {
					result.catch((err) => {
						if (err instanceof Error) {
							setError(err);
						} else {
							setError(new Error(String(err)));
						}
					});
					return false;
				}
				return result;
			} catch (err) {
				if (err instanceof Error) {
					setError(err);
				} else {
					setError(new Error(String(err)));
				}
				return false;
			}
		},
		[hydrated, policy, cache]
	);

	const keys = policy?.keys ? policy.keys() : [];

	return {
		can,
		keys,
		isLoading: !hydrated,
		error,
	};
}
