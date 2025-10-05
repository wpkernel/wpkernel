/**
 * Policy context management and action integration
 *
 * This module provides the policy proxy pattern used in actions via `ctx.policy.assert()`.
 * It handles:
 * - Request context propagation (actionName, requestId for event correlation)
 * - Policy runtime resolution from global action runtime
 * - Event enrichment with request metadata for denied policies
 * - Graceful degradation when policy runtime is unavailable
 *
 * The proxy ensures policy checks in actions include full request context in events,
 * enabling audit trails and debugging (e.g., "which action triggered this denial?").
 *
 * @module @geekist/wp-kernel/policy/context
 */

import { KernelError } from '../error/KernelError';
import type { ActionRuntime } from '../actions/types';
import type { PolicyHelpers } from './types';

export interface PolicyProxyOptions {
	actionName: string;
	requestId: string;
	namespace: string;
	scope: 'crossTab' | 'tabLocal';
	bridged: boolean;
}

type PolicyRequestContext = PolicyProxyOptions;

let currentContext: PolicyRequestContext | undefined;

export function getPolicyRuntime(): ActionRuntime | undefined {
	return globalThis.__WP_KERNEL_ACTION_RUNTIME__;
}

export function getPolicyRequestContext(): PolicyRequestContext | undefined {
	return currentContext;
}

export function withPolicyRequestContext<T>(
	context: PolicyRequestContext,
	fn: () => T
): T {
	const previous = currentContext;
	currentContext = context;
	try {
		const result = fn();
		if (result instanceof Promise) {
			return result.finally(() => {
				currentContext = previous;
			}) as unknown as T;
		}
		currentContext = previous;
		return result;
	} catch (error) {
		currentContext = previous;
		throw error;
	}
}

export function createPolicyProxy(
	options: PolicyProxyOptions
): Pick<PolicyHelpers<Record<string, unknown>>, 'assert' | 'can'> {
	let warned = false;

	/**
	 * Normalize params array to single value or empty array.
	 *
	 * @param params - Variadic params from can/assert calls
	 * @return Empty array or array with single param value
	 * @internal
	 */
	function normalizeParams(params: unknown[]): [] | [unknown] {
		return params.length === 0 ? [] : [params[0]];
	}

	function resolvePolicy(): Partial<PolicyHelpers<Record<string, unknown>>> {
		const runtime = getPolicyRuntime();
		if (runtime?.policy) {
			return runtime.policy;
		}

		throw new KernelError('DeveloperError', {
			message: `Action "${options.actionName}" attempted to assert a policy without a policy runtime configured.`,
		});
	}

	return {
		assert(key: string, ...params: unknown[]): void | Promise<void> {
			const runtimePolicy = resolvePolicy();
			return withPolicyRequestContext(options, () => {
				const normalizedParams = normalizeParams(params) as never[];

				if (runtimePolicy.assert) {
					const assertFn = runtimePolicy.assert as (
						policyKey: string,
						param?: unknown
					) => void | Promise<void>;
					if (normalizedParams.length === 0) {
						return assertFn(key, undefined);
					}
					return assertFn(key, normalizedParams[0]);
				}

				if (runtimePolicy.can) {
					const canFn = runtimePolicy.can as (
						policyKey: string,
						param?: unknown
					) => boolean | Promise<boolean>;
					const result =
						normalizedParams.length === 0
							? canFn(key)
							: canFn(key, normalizedParams[0]);
					if (result instanceof Promise) {
						return result.then((allowed) => {
							if (!allowed) {
								throw new KernelError('PolicyDenied', {
									message: `Policy "${key}" denied by runtime can().`,
									context: {
										policyKey: key,
										requestId: options.requestId,
									},
								});
							}
						});
					}

					if (!result) {
						throw new KernelError('PolicyDenied', {
							message: `Policy "${key}" denied by runtime can().`,
							context: {
								policyKey: key,
								requestId: options.requestId,
							},
						});
					}
					return;
				}

				throw new KernelError('DeveloperError', {
					message: `Action "${options.actionName}" attempted to assert policy "${key}" but runtime does not expose assert().`,
				});
			});
		},
		can(key: string, ...params: unknown[]): boolean | Promise<boolean> {
			const runtimePolicy = getPolicyRuntime()?.policy;
			if (!runtimePolicy?.can) {
				if (!warned && process.env.NODE_ENV !== 'production') {
					console.warn(
						`Action "${options.actionName}" called policy.can('${key}') but no policy runtime is configured.`
					);
					warned = true;
				}
				return false;
			}
			const normalizedParams = normalizeParams(params) as never[];
			const canFn = runtimePolicy.can as (
				policyKey: string,
				param?: unknown
			) => boolean | Promise<boolean>;
			if (normalizedParams.length === 0) {
				return canFn(key);
			}
			return canFn(key, normalizedParams[0]);
		},
	};
}
