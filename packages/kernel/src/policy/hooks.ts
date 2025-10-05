/**
 * React integration for policy evaluation
 *
 * Provides the `usePolicy()` hook for SSR-safe, cache-synchronized capability checks
 * in UI components. Handles hydration mismatches by returning loading state initially,
 * then evaluating policies after client-side hydration.
 *
 * The hook automatically subscribes to cache updates via `useSyncExternalStore`,
 * ensuring UI reflects policy changes immediately (e.g., after login/logout events).
 *
 * @module @geekist/wp-kernel/policy/hooks
 */

import {
	useCallback,
	useEffect,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { KernelError } from '../error/KernelError';
import { createPolicyCacheKey } from './cache';
import { getPolicyRuntime } from './context';
import type { ParamsOf, PolicyHelpers, UsePolicyResult } from './types';

type PolicyLike<K extends Record<string, unknown>> =
	| PolicyHelpers<K>
	| (Partial<PolicyHelpers<K>> & { cache?: PolicyHelpers<K>['cache'] });

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
 *
 * Returns helpers for checking capabilities without throwing errors. Use this for
 * conditional rendering (show/hide UI elements), disabling form fields, or displaying
 * permission notices based on user capabilities.
 *
 * **Hydration Behavior**: Returns `isLoading: true` during SSR and initial client render
 * to avoid hydration mismatches. Once React hydrates, the hook evaluates policies from
 * the runtime cache and updates the UI.
 *
 * **Cache Synchronization**: Automatically subscribes to cache updates via `useSyncExternalStore`.
 * When policies change (e.g., after login/logout, role changes, or cache invalidation),
 * all components using this hook re-render with updated capabilities.
 *
 * **Async Policy Handling**: If a policy rule is async and not yet cached, `can()` returns
 * `false` immediately. The hook catches the promise, waits for resolution, and re-renders
 * when the result is cached. This prevents UI flicker during capability checks.
 *
 * **Error Handling**: If the policy runtime is not configured, sets `error` state with
 * a `DeveloperError`. If a policy rule throws during evaluation, catches the error and
 * exposes it via the `error` property.
 *
 * @template K - Policy map type defining capability keys and their parameter types
 * @return Policy evaluation result with can(), keys(), isLoading, and error properties
 * @throws Never throws - all errors are captured in the error state
 * @example
 * ```tsx
 * import { usePolicy } from '@geekist/wp-kernel/policy';
 *
 * type MyPolicies = {
 *   'posts.edit': number;
 *   'posts.delete': number;
 *   'posts.create': void;
 * };
 *
 * function PostActions({ postId }: { postId: number }) {
 *   const policy = usePolicy<MyPolicies>();
 *
 *   // Handle loading state (SSR/hydration)
 *   if (policy.isLoading) {
 *     return <Spinner />;
 *   }
 *
 *   // Handle errors
 *   if (policy.error) {
 *     return <Alert>Policy check failed: {policy.error.message}</Alert>;
 *   }
 *
 *   // Check capabilities
 *   const canEdit = policy.can('posts.edit', postId);
 *   const canDelete = policy.can('posts.delete', postId);
 *   const canCreate = policy.can('posts.create');
 *
 *   return (
 *     <div>
 *       <Button disabled={!canEdit}>Edit Post</Button>
 *       <Button disabled={!canDelete} variant="danger">Delete Post</Button>
 *       {canCreate && <Button>Create New Post</Button>}
 *     </div>
 *   );
 * }
 * ```
 * @example
 * ```tsx
 * // Conditional rendering without loading state
 * function AdminMenu() {
 *   const policy = usePolicy<{ 'admin.access': void }>();
 *
 *   // Don't show anything until hydrated
 *   if (policy.isLoading) return null;
 *
 *   // Only render if user has access
 *   if (!policy.can('admin.access')) return null;
 *
 *   return <AdminMenuItems />;
 * }
 * ```
 * @example
 * ```tsx
 * // Show all available capabilities
 * function DebugPanel() {
 *   const policy = usePolicy();
 *
 *   if (policy.isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {policy.keys().map(key => (
 *         <li key={key}>
 *           {key}: {policy.can(key) ? '✅ Allowed' : '❌ Denied'}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
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
