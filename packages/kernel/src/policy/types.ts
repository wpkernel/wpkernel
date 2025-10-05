/**
 * Policy module type definitions.
 *
 * These types describe the runtime contract for declarative capability policies.
 * Policies are evaluated both within actions (for enforcement) and within UI hooks
 * (for conditional rendering). All enforcement flows through strongly typed helpers
 * produced by `definePolicy()`.
 *
 * Key contracts:
 * - **PolicyRule**: Sync/async capability check function signature
 * - **PolicyContext**: Rule evaluation context with adapters and cache
 * - **PolicyHelpers**: Public API returned by definePolicy()
 * - **PolicyCache**: Cache storage and synchronization interface
 * - **UsePolicyResult**: React hook return type for UI integration
 *
 * @module @geekist/wp-kernel/policy/types
 */

import type { Reporter } from '../reporter';

/**
 * Reporter interface used for structured diagnostics from the policy runtime.
 *
 * Aliased from the shared reporter module to ensure policy and actions emit
 * consistent log metadata.
 */
export type PolicyReporter = Reporter;

/**
 * Policy rule signature.
 *
 * Rules can be synchronous (return boolean) or asynchronous (return Promise<boolean>).
 * Use async rules when checking capabilities requires REST API calls or async operations
 * (e.g., wp.data.select('core').canUser(), fetch() calls).
 *
 * The policy runtime automatically caches async rule results to avoid redundant API calls.
 * Rules receive a PolicyContext with adapters, cache, and reporter for structured evaluation.
 *
 * @template P - Parameters required by the rule. `void` indicates no params needed.
 * @example
 * ```typescript
 * // Synchronous rule (no params)
 * const viewRule: PolicyRule<void> = (ctx) => {
 *   return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
 * };
 *
 * // Async rule with params
 * const editRule: PolicyRule<number> = async (ctx, postId) => {
 *   const result = await ctx.adapters.wp?.canUser('update', {
 *     kind: 'postType',
 *     name: 'post',
 *     id: postId
 *   });
 *   return result ?? false;
 * };
 *
 * // Complex params
 * const assignRule: PolicyRule<{ userId: number; postId: number }> = async (ctx, params) => {
 *   const canEdit = await ctx.adapters.wp?.canUser('update', {
 *     kind: 'postType',
 *     name: 'post',
 *     id: params.postId
 *   });
 *   return canEdit && params.userId > 0;
 * };
 * ```
 */
export type PolicyRule<P = void> = (
	ctx: PolicyContext,
	params: P
) => boolean | Promise<boolean>;

/**
 * Mapping from policy key to rule implementation.
 */
export type PolicyMap<Keys extends Record<string, unknown>> = {
	[K in keyof Keys]: PolicyRule<Keys[K]>;
};

/**
 * Extract the tuple type used for params in `can`/`assert` helpers.
 * Ensures that void params are optional while others remain required.
 */
export type ParamsOf<K, Key extends keyof K> = K[Key] extends void
	? []
	: [K[Key]];

/**
 * Cache storage options for policy evaluations.
 */
export interface PolicyCacheOptions {
	ttlMs?: number;
	storage?: 'memory' | 'session';
	crossTab?: boolean;
}

/**
 * Entry stored in the policy cache.
 */
export interface PolicyCacheEntry {
	value: boolean;
	expiresAt: number;
}

/**
 * Minimal cache contract used by the policy runtime and React hook.
 */
export interface PolicyCache {
	get: (key: string) => boolean | undefined;
	set: (
		key: string,
		value: boolean,
		options?: {
			ttlMs?: number;
			source?: 'local' | 'remote';
			expiresAt?: number;
		}
	) => void;
	invalidate: (policyKey?: string) => void;
	clear: () => void;
	keys: () => string[];
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => number;
}

/**
 * Adapters that policy rules can leverage when evaluating capabilities.
 *
 * Adapters provide standardized interfaces for capability checking across different
 * systems (WordPress core, REST APIs, custom backends). The policy runtime auto-detects
 * and injects wp.data.select('core').canUser() when available.
 *
 * @example
 * ```typescript
 * // Using WordPress adapter in policy rule
 * const policy = definePolicy({
 *   'posts.edit': async (ctx, postId: number) => {
 *     // ctx.adapters.wp is auto-injected
 *     const result = await ctx.adapters.wp?.canUser('update', {
 *       kind: 'postType',
 *       name: 'post',
 *       id: postId
 *     });
 *     return result ?? false;
 *   }
 * });
 * ```
 * @example
 * ```typescript
 * // Custom adapter for REST endpoint probing
 * const policy = definePolicy(rules, {
 *   adapters: {
 *     restProbe: async (key) => {
 *       const res = await fetch(`/wp-json/acme/v1/capabilities/${key}`);
 *       return res.ok;
 *     }
 *   }
 * });
 *
 * // Use in rule
 * 'feature.enabled': async (ctx) => {
 *   return await ctx.adapters.restProbe?.('advanced-features') ?? false;
 * }
 * ```
 */
export interface PolicyAdapters {
	wp?: {
		canUser: (
			action: 'create' | 'read' | 'update' | 'delete',
			resource:
				| { path: string }
				| { kind: 'postType'; name: string; id?: number }
		) => boolean | Promise<boolean>;
	};
	restProbe?: (key: string) => Promise<boolean>;
}

/**
 * Policy evaluation context passed to every rule.
 *
 * The context provides adapters for capability checking, cache for result storage,
 * reporter for logging, and namespace for event naming. Rules receive this as their
 * first parameter and use it to make capability decisions.
 *
 * @example
 * ```typescript
 * const rule: PolicyRule<number> = async (ctx, postId) => {
 *   // Log evaluation
 *   ctx.reporter?.debug('Checking edit capability', { postId });
 *
 *   // Check cached result first
 *   const cacheKey = `posts.edit::${postId}`;
 *   const cached = ctx.cache.get(cacheKey);
 *   if (typeof cached === 'boolean') {
 *     ctx.reporter?.debug('Cache hit', { result: cached });
 *     return cached;
 *   }
 *
 *   // Use adapter for capability check
 *   const result = await ctx.adapters.wp?.canUser('update', {
 *     kind: 'postType',
 *     name: 'post',
 *     id: postId
 *   }) ?? false;
 *
 *   ctx.reporter?.info('Capability checked', { postId, result });
 *   return result;
 * };
 * ```
 */
export interface PolicyContext {
	namespace: string;
	adapters: PolicyAdapters;
	cache: PolicyCache;
	reporter?: PolicyReporter;
}

/**
 * Additional options accepted by `definePolicy()`.
 */
export interface PolicyOptions {
	namespace?: string;
	adapters?: PolicyAdapters;
	cache?: PolicyCacheOptions;
	debug?: boolean;
}

/**
 * Runtime helpers exposed by `definePolicy()`.
 */
export interface PolicyHelpers<K extends Record<string, unknown>> {
	can: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => boolean | Promise<boolean>;
	assert: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => void | Promise<void>;
	keys: () => (keyof K)[];
	extend: (additionalMap: Partial<PolicyMap<K>>) => void;
	readonly cache: PolicyCache;
}

/**
 * Payload emitted with `{namespace}.policy.denied` events.
 */
export interface PolicyDeniedEvent {
	policyKey: string;
	context?: Record<string, unknown>;
	requestId?: string;
	timestamp: number;
	reason?: string;
	messageKey?: string;
}

/**
 * Result returned by the `usePolicy()` hook.
 */
export interface UsePolicyResult<K extends Record<string, unknown>> {
	can: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => boolean;
	keys: (keyof K)[];
	isLoading: boolean;
	error?: Error;
}
