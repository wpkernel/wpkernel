/**
 * Policy runtime — definePolicy implementation
 *
 * Policies provide declarative, type-safe capability checks for UI conditional rendering
 * and action enforcement. This module handles rule evaluation, caching, event emission,
 * and WordPress adapter integration.
 *
 * The policy runtime automatically:
 * - Caches evaluation results (memory + optional sessionStorage)
 * - Syncs cache across browser tabs via BroadcastChannel
 * - Emits denied events via @wordpress/hooks and PHP bridge
 * - Detects and uses wp.data.select('core').canUser() when available
 * - Registers with action runtime for ctx.policy access
 *
 * @module @geekist/wp-kernel/policy/define
 */

import { KernelError } from '../error/KernelError';
import { PolicyDeniedError } from '../error/PolicyDeniedError';
import { getNamespace } from '../namespace/detect';
import {
	WPK_SUBSYSTEM_NAMESPACES,
	WPK_INFRASTRUCTURE,
} from '../namespace/constants';
import {
	createReporter as createKernelReporter,
	createNoopReporter,
} from '../reporter';
import { createPolicyCache, createPolicyCacheKey } from './cache';
import {
	getPolicyRequestContext,
	getPolicyRuntime,
	type PolicyProxyOptions,
} from './context';
import type {
	ParamsOf,
	PolicyAdapters,
	PolicyContext,
	PolicyHelpers,
	PolicyMap,
	PolicyOptions,
	PolicyReporter,
	PolicyRule,
	PolicyDeniedEvent,
} from './types';

const POLICY_EVENT_CHANNEL = WPK_INFRASTRUCTURE.POLICY_EVENT_CHANNEL;
const POLICY_DENIED_EVENT = 'policy.denied';
const BRIDGE_POLICY_DENIED_EVENT = 'bridge.policy.denied';

const policyModuleReporter = createKernelReporter({
	namespace: WPK_SUBSYSTEM_NAMESPACES.POLICY,
	channel: 'all',
	level: 'warn',
});

type WordPressHooks = {
	doAction: (eventName: string, payload: unknown) => void;
};

let eventChannel: BroadcastChannel | null | undefined;

/**
 * Get WordPress hooks interface for event emission.
 *
 * Returns null in SSR environments or when @wordpress/hooks is unavailable.
 * Used internally for emitting policy.denied events via wp.hooks.doAction().
 *
 * @return WordPress hooks interface or null if unavailable
 * @internal
 */
function getHooks(): WordPressHooks | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const wp = (window as Window & { wp?: { hooks?: WordPressHooks } }).wp;
	if (!wp?.hooks || typeof wp.hooks.doAction !== 'function') {
		return null;
	}
	return wp.hooks;
}

/**
 * Get or create BroadcastChannel for cross-tab policy events.
 *
 * Caches the channel instance to avoid creating multiple channels. Returns null
 * in SSR environments or when BroadcastChannel API is unavailable. Used for
 * syncing policy.denied events across browser tabs.
 *
 * @return BroadcastChannel instance or null if unavailable
 * @internal
 */
function getEventChannel(): BroadcastChannel | null {
	if (eventChannel !== undefined) {
		return eventChannel;
	}

	if (
		typeof window === 'undefined' ||
		typeof window.BroadcastChannel !== 'function'
	) {
		eventChannel = null;
		return eventChannel;
	}

	try {
		eventChannel = new window.BroadcastChannel(POLICY_EVENT_CHANNEL);
	} catch (error) {
		policyModuleReporter.warn(
			'Failed to create BroadcastChannel for policy events.',
			{ error }
		);
		eventChannel = null;
	}

	return eventChannel;
}

/**
 * Resolve the reporter used for policy diagnostics.
 *
 * Debug mode enables the shared reporter with both console and hook transports.
 * When debug is disabled, a no-op reporter is returned to avoid noise.
 *
 * @param debug     - Whether debug mode is enabled for the policy runtime
 * @param namespace - Namespace used for reporter context
 */
function resolveReporter(
	debug: boolean | undefined,
	namespace: string
): PolicyReporter {
	if (!debug) {
		return createNoopReporter();
	}

	return createKernelReporter({
		namespace,
		channel: 'all',
		level: 'debug',
	});
}

/**
 * Resolve policy adapters with auto-detection.
 *
 * Merges user-provided adapters with auto-detected WordPress capabilities.
 * If user doesn't provide a wp adapter, attempts to detect and use
 * wp.data.select('core').canUser() automatically.
 *
 * @param options  - Policy options (may contain custom adapters)
 * @param reporter - Policy reporter for logging adapter resolution issues
 * @return Resolved adapters with wp and restProbe interfaces
 * @internal
 */
function resolveAdapters(
	options: PolicyOptions | undefined,
	reporter: PolicyReporter
): PolicyAdapters {
	const adapters = options?.adapters ?? {};
	const resolvedWp = adapters.wp ?? detectWpCanUser(reporter);
	return {
		wp: resolvedWp,
		restProbe: adapters.restProbe,
	};
}

/**
 * Auto-detect and wrap WordPress native capability checking.
 *
 * Attempts to access wp.data.select('core').canUser() for checking WordPress
 * capabilities. Returns undefined in SSR or when @wordpress/data is unavailable.
 * The returned adapter wraps canUser with error handling and fallback to false.
 *
 * @param reporter - Policy reporter for logging detection failures
 * @return WordPress adapter interface or undefined if unavailable
 * @internal
 */
function detectWpCanUser(reporter: PolicyReporter) {
	if (typeof window === 'undefined') {
		return undefined;
	}

	const wp = (
		window as Window & {
			wp?: {
				data?: {
					select?: (store: string) =>
						| {
								canUser?: (
									action:
										| 'create'
										| 'read'
										| 'update'
										| 'delete',
									resource:
										| { path: string }
										| {
												kind: 'postType';
												name: string;
												id?: number;
										  }
								) => boolean | Promise<boolean>;
						  }
						| undefined;
				};
			};
		}
	).wp;

	if (!wp?.data?.select) {
		return undefined;
	}

	return {
		canUser(
			action: 'create' | 'read' | 'update' | 'delete',
			resource:
				| { path: string }
				| { kind: 'postType'; name: string; id?: number }
		) {
			try {
				const store = wp.data?.select?.('core');
				const canUser = store?.canUser;
				if (typeof canUser === 'function') {
					return canUser(action, resource);
				}
				return false;
			} catch (error) {
				reporter.warn(
					'Failed to invoke wp.data.select("core").canUser',
					{
						error,
					}
				);
				return false;
			}
		},
	};
}

/**
 * Type guard asserting policy rule returned boolean value.
 *
 * Throws DeveloperError if rule returns non-boolean (e.g., number, string, object).
 * This catches developer mistakes like forgetting to return a value or returning
 * undefined from an async function.
 *
 * @param value - Value returned by policy rule
 * @param key   - Policy key for error message
 * @throws DeveloperError if value is not boolean
 * @internal
 */
function ensureBoolean(value: unknown, key: string): asserts value is boolean {
	if (typeof value !== 'boolean') {
		throw new KernelError('DeveloperError', {
			message: `Policy "${key}" must return a boolean. Received ${typeof value}.`,
		});
	}
}

/**
 * Emit policy.denied event to all registered listeners.
 *
 * Broadcasts to three channels:
 * - @wordpress/hooks via {namespace}.policy.denied
 * - BroadcastChannel for cross-tab notification
 * - PHP bridge (when bridged: true in action context)
 *
 * @param namespace      - Plugin namespace for event naming
 * @param payload        - Event payload (policyKey, context, messageKey, etc.)
 * @param requestContext - Optional captured request context (prevents race conditions in concurrent calls)
 * @internal
 */
function emitPolicyDenied(
	namespace: string,
	payload: Omit<PolicyDeniedEvent, 'timestamp'>,
	requestContext?: PolicyProxyOptions
) {
	const resolvedNamespace = requestContext?.namespace ?? namespace;
	const timestamp = Date.now();
	const eventPayload: PolicyDeniedEvent = {
		...payload,
		timestamp,
		requestId: payload.requestId ?? requestContext?.requestId,
	};

	const eventName = `${resolvedNamespace}.${POLICY_DENIED_EVENT}`;
	emitPolicyHooks(eventName, eventPayload);
	broadcastPolicyDenied(resolvedNamespace, eventPayload);
	emitPolicyBridge(
		resolvedNamespace,
		eventPayload,
		requestContext,
		timestamp
	);
}

/**
 * Emit policy denied event to WordPress hooks
 *
 * @internal
 * @param eventName - Full event name (e.g., 'namespace.policy.denied')
 * @param payload   - Policy denied event payload
 */
function emitPolicyHooks(eventName: string, payload: PolicyDeniedEvent): void {
	getHooks()?.doAction?.(eventName, payload);
}

/**
 * Broadcast policy denied event to other browser tabs
 *
 * Uses BroadcastChannel API for cross-tab synchronization of policy events.
 *
 * @internal
 * @param namespace - Plugin namespace for event scoping
 * @param payload   - Policy denied event payload
 */
function broadcastPolicyDenied(
	namespace: string,
	payload: PolicyDeniedEvent
): void {
	getEventChannel()?.postMessage({
		type: POLICY_DENIED_EVENT,
		namespace,
		payload,
	});
}

/**
 * Emit policy denied event to PHP bridge
 *
 * Sends event to server-side bridge when bridged mode is enabled in action context.
 * Only emits if request context indicates bridging is active.
 *
 * @internal
 * @param namespace      - Plugin namespace for event scoping
 * @param payload        - Policy denied event payload
 * @param requestContext - Request context containing bridged flag
 * @param timestamp      - Event timestamp in milliseconds
 */
function emitPolicyBridge(
	namespace: string,
	payload: PolicyDeniedEvent,
	requestContext: PolicyProxyOptions | undefined,
	timestamp: number
): void {
	if (!requestContext?.bridged) {
		return;
	}

	const runtime = getPolicyRuntime();
	runtime?.bridge?.emit?.(
		`${namespace}.${BRIDGE_POLICY_DENIED_EVENT}`,
		payload,
		{
			...requestContext,
			timestamp,
		}
	);
}

/**
 * Create structured PolicyDenied error with i18n messageKey.
 *
 * Generates error with:
 * - messageKey for internationalization: "policy.denied.{namespace}.{policyKey}"
 * - context object with policyKey and params
 * - KernelError code: PolicyDenied
 *
 * @param namespace - Plugin namespace for messageKey generation
 * @param policyKey - Policy key that was denied
 * @param params    - Parameters passed to policy check
 * @return Object with error, messageKey, and context for event emission
 * @internal
 */
function createDeniedError(
	namespace: string,
	policyKey: string,
	params: unknown
) {
	const error = new PolicyDeniedError({
		namespace,
		policyKey,
		params,
	});

	return {
		error,
		messageKey: error.messageKey,
		context: error.context,
	};
}

/**
 * Define a policy runtime with declarative capability rules.
 *
 * Policies provide **type-safe, cacheable capability checks** for both UI and actions.
 * They enable conditional rendering (show/hide buttons), form validation (disable fields),
 * and enforcement (throw before writes) — all from a single source of truth.
 *
 * This is the foundation of **Policy-Driven UI**: Components query capabilities without
 * knowing implementation details. Rules can leverage WordPress native capabilities
 * (`wp.data.select('core').canUser`), REST probes, or custom logic.
 *
 * ## What Policies Do
 *
 * Every policy runtime provides:
 * - **`can(key, params?)`** — Check capability (returns boolean, never throws)
 * - **`assert(key, params?)`** — Enforce capability (throws `PolicyDenied` if false)
 * - **Cache management** — Automatic result caching with TTL and cross-tab sync
 * - **Event emission** — Broadcast denied events via `@wordpress/hooks` and BroadcastChannel
 * - **React integration** — `usePolicy()` hook (provided by `@geekist/wp-kernel-ui`) for SSR-safe conditional rendering
 * - **Action integration** — `ctx.policy.assert()` in actions for write protection
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { definePolicy } from '@geekist/wp-kernel/policy';
 *
 * // Define capability rules
 * const policy = definePolicy<{
 *   'posts.view': void;           // No params needed
 *   'posts.edit': number;         // Requires post ID
 *   'posts.delete': number;       // Requires post ID
 * }>({
 *   'posts.view': (ctx) => {
 *     // Sync rule: immediate boolean
 *     return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
 *   },
 *   'posts.edit': async (ctx, postId) => {
 *     // Async rule: checks specific post capability
 *     const result = await ctx.adapters.wp?.canUser('update', {
 *       kind: 'postType',
 *       name: 'post',
 *       id: postId
 *     });
 *     return result ?? false;
 *   },
 *   'posts.delete': async (ctx, postId) => {
 *     const result = await ctx.adapters.wp?.canUser('delete', {
 *       kind: 'postType',
 *       name: 'post',
 *       id: postId
 *     });
 *     return result ?? false;
 *   }
 * });
 *
 * // Use in actions (enforcement)
 * export const DeletePost = defineAction('Post.Delete', async (ctx, { id }) => {
 *   ctx.policy.assert('posts.delete', id); // Throws if denied
 *   await post.remove!(id);
 *   ctx.emit(post.events.deleted, { id });
 * });
 *
 * // Use in UI (conditional rendering)
 * function PostActions({ postId }: { postId: number }) {
 *   const policy = usePolicy<typeof policy>();
 *   const canEdit = policy.can('posts.edit', postId);
 *   const canDelete = policy.can('posts.delete', postId);
 *
 *   return (
 *     <div>
 *       <Button disabled={!canEdit}>Edit</Button>
 *       <Button disabled={!canDelete}>Delete</Button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Caching & Performance
 *
 * Results are **automatically cached** with:
 * - **Memory cache** — Instant lookups for repeated checks
 * - **Cross-tab sync** — BroadcastChannel keeps all tabs in sync
 * - **Session storage** — Optional persistence (set `cache.storage: 'session'`)
 * - **TTL support** — Cache expires after configurable timeout (default: 60s)
 *
 * ```typescript
 * const policy = definePolicy(rules, {
 *   cache: {
 *     ttlMs: 30_000,        // 30 second cache
 *     storage: 'session',   // Persist in sessionStorage
 *     crossTab: true        // Sync across browser tabs
 *   }
 * });
 * ```
 *
 * Cache is invalidated automatically when rules change via `policy.extend()`,
 * or manually via `policy.cache.invalidate()`.
 *
 * ## WordPress Integration
 *
 * By default, policies auto-detect and use `wp.data.select('core').canUser()` for
 * native WordPress capability checks:
 *
 * ```typescript
 * // Automatically uses wp.data when available
 * const policy = definePolicy({
 *   'posts.edit': async (ctx, postId) => {
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
 *
 * Override adapters for custom capability systems:
 *
 * ```typescript
 * const policy = definePolicy(rules, {
 *   adapters: {
 *     wp: {
 *       canUser: async (action, resource) => {
 *         // Custom implementation (e.g., check external API)
 *         return fetch(`/api/capabilities?action=${action}`).then(r => r.json());
 *       }
 *     },
 *     restProbe: async (key) => {
 *       // Optional: probe REST endpoints for availability
 *       return fetch(`/wp-json/acme/v1/probe/${key}`).then(r => r.ok);
 *     }
 *   }
 * });
 * ```
 *
 * ## Event Emission
 *
 * When capabilities are denied, events are emitted to:
 * - **`@wordpress/hooks`** — `{namespace}.policy.denied` with full context
 * - **BroadcastChannel** — Cross-tab notification for UI synchronization
 * - **PHP bridge** — Optional server-side logging (when `bridged: true` in actions)
 *
 * ```typescript
 * // Listen for denied events
 * wp.hooks.addAction('acme.policy.denied', 'acme-plugin', (event) => {
 *   const reporter = createReporter({ namespace: 'acme.policy', channel: 'all' });
 *   reporter.warn('Policy denied:', event.policyKey, event.context);
 *   // Show toast notification, track in analytics, etc.
 * });
 * ```
 *
 * ## Runtime Wiring
 *
 * Policies are **automatically registered** with the action runtime on definition:
 *
 * ```typescript
 * // 1. Define policy (auto-registers)
 * const policy = definePolicy(rules);
 *
 * // 2. Use in actions immediately
 * const CreatePost = defineAction('Post.Create', async (ctx, args) => {
 *   ctx.policy.assert('posts.create'); // Works automatically
 *   // ...
 * });
 * ```
 *
 * For custom runtime configuration:
 *
 * ```typescript
 * globalThis.__WP_KERNEL_ACTION_RUNTIME__ = {
 *   policy: definePolicy(rules),
 *   jobs: defineJobQueue(),
 *   bridge: createPHPBridge(),
 *   reporter: createReporter()
 * };
 * ```
 *
 * ## Extending Policies
 *
 * Add or override rules at runtime:
 *
 * ```typescript
 * policy.extend({
 *   'posts.publish': async (ctx, postId) => {
 *     // New rule
 *     return ctx.adapters.wp?.canUser('publish_posts') ?? false;
 *   },
 *   'posts.edit': (ctx, postId) => {
 *     // Override existing rule
 *     return false; // Disable editing
 *   }
 * });
 * // Cache automatically invalidated for affected keys
 * ```
 *
 * ## Type Safety
 *
 * Policy keys and parameters are **fully typed**:
 *
 * ```typescript
 * type MyPolicies = {
 *   'posts.view': void;          // No params
 *   'posts.edit': number;        // Requires number
 *   'posts.assign': { userId: number; postId: number }; // Requires object
 * };
 *
 * const policy = definePolicy<MyPolicies>({ ... });
 *
 * policy.can('posts.view');           // ✅ OK
 * policy.can('posts.edit', 123);      // ✅ OK
 * policy.can('posts.edit');           // ❌ Type error: missing param
 * policy.can('posts.unknown');        // ❌ Type error: unknown key
 * ```
 *
 * ## Async vs Sync Rules
 *
 * Rules can be **synchronous** (return `boolean`) or **asynchronous** (return `Promise<boolean>`).
 * Async rules are automatically detected and cached to avoid redundant API calls:
 *
 * ```typescript
 * definePolicy({
 *   'fast.check': (ctx) => true,                    // Sync: immediate
 *   'slow.check': async (ctx) => {                  // Async: cached
 *     const result = await fetch('/api/check');
 *     return result.ok;
 *   }
 * });
 * ```
 *
 * In React components, async rules return `false` during evaluation and update when resolved.
 *
 * @template K - Policy map type defining capability keys and their parameter types
 * @param    map     - Object mapping policy keys to rule functions
 * @param    options - Configuration options for namespace, adapters, caching, and debugging
 * @return Policy helpers object with can(), assert(), keys(), extend(), and cache API
 * @throws DeveloperError if a rule returns non-boolean value
 * @throws PolicyDenied when assert() called on denied capability
 * @example
 * ```typescript
 * // Minimal example (no params)
 * const policy = definePolicy<{ 'admin.access': void }>({
 *   'admin.access': (ctx) => ctx.adapters.wp?.canUser('manage_options') ?? false
 * });
 *
 * if (policy.can('admin.access')) {
 *   // Show admin menu
 * }
 * ```
 * @example
 * ```typescript
 * // With custom adapters
 * const policy = definePolicy(rules, {
 *   namespace: 'acme-plugin',
 *   adapters: {
 *     restProbe: async (key) => {
 *       const res = await fetch(`/wp-json/acme/v1/capabilities/${key}`);
 *       return res.ok;
 *     }
 *   },
 *   cache: { ttlMs: 5000, storage: 'session' },
 *   debug: true // Log all policy checks
 * });
 * ```
 */
export function definePolicy<K extends Record<string, unknown>>(
	map: PolicyMap<K>,
	options?: PolicyOptions
): PolicyHelpers<K> {
	const namespace = options?.namespace ?? getNamespace();
	const reporter = resolveReporter(options?.debug, namespace);
	const cache = createPolicyCache(options?.cache, namespace);
	const adapters = resolveAdapters(options, reporter);

	const policyContext: PolicyContext = {
		namespace,
		adapters,
		cache,
		reporter,
	};

	const rules = new Map<keyof K, PolicyRule<K[keyof K]>>();
	(Object.keys(map) as Array<keyof K>).forEach((key) => {
		rules.set(key, map[key]);
	});

	const asyncKeys = new Set<keyof K>();
	const inFlight = new Map<string, Promise<boolean>>();

	function getRule<Key extends keyof K>(key: Key): PolicyRule<K[Key]> {
		const rule = rules.get(key);
		if (!rule) {
			const availableKeys = Array.from(rules.keys()).map(String);
			throw new KernelError('DeveloperError', {
				message: `Policy "${String(key)}" is not registered. Available keys: ${availableKeys.join(', ')}`,
				context: {
					requestedKey: String(key),
					availableKeys,
				},
			});
		}
		return rule as PolicyRule<K[Key]>;
	}

	function evaluate<Key extends keyof K>(
		key: Key,
		params: ParamsOf<K, Key>[0] | undefined
	): boolean | Promise<boolean> {
		const cacheKey = createPolicyCacheKey(String(key), params);

		if (asyncKeys.has(key)) {
			const cached = cache.get(cacheKey);
			if (typeof cached === 'boolean') {
				return cached;
			}

			const inflight = inFlight.get(cacheKey);
			if (inflight) {
				return inflight;
			}
		}

		const rule = getRule(key);
		const result = rule(policyContext, params as K[Key]);

		if (result instanceof Promise) {
			asyncKeys.add(key);
			const promise = result
				.then((value) => {
					ensureBoolean(value, String(key));
					cache.set(cacheKey, value);
					inFlight.delete(cacheKey);
					return value;
				})
				.catch((error) => {
					inFlight.delete(cacheKey);
					throw error;
				});
			inFlight.set(cacheKey, promise);
			return promise;
		}

		ensureBoolean(result, String(key));
		return result;
	}

	const helpers: PolicyHelpers<K> = {
		can<Key extends keyof K>(
			key: Key,
			...params: ParamsOf<K, Key>
		): boolean | Promise<boolean> {
			const param = params[0] as ParamsOf<K, Key>[0] | undefined;
			return evaluate(key, param);
		},
		assert<Key extends keyof K>(
			key: Key,
			...params: ParamsOf<K, Key>
		): void | Promise<void> {
			const param = params[0] as ParamsOf<K, Key>[0] | undefined;
			// Capture request context immediately to prevent race conditions
			// in concurrent policy checks (see PR #60 review comment)
			const capturedContext = getPolicyRequestContext();

			const outcome = evaluate(key, param);
			if (outcome instanceof Promise) {
				return outcome.then((allowed) => {
					if (!allowed) {
						const { error, messageKey, context } =
							createDeniedError(namespace, String(key), param);
						emitPolicyDenied(
							namespace,
							{
								policyKey: String(key),
								context,
								messageKey,
							},
							capturedContext
						);
						throw error;
					}
				});
			}

			if (!outcome) {
				const { error, messageKey, context } = createDeniedError(
					namespace,
					String(key),
					param
				);
				emitPolicyDenied(
					namespace,
					{
						policyKey: String(key),
						context,
						messageKey,
					},
					capturedContext
				);
				throw error;
			}
		},
		keys(): (keyof K)[] {
			return Array.from(rules.keys());
		},
		extend(additionalMap: Partial<PolicyMap<K>>): void {
			(Object.keys(additionalMap) as Array<keyof K>).forEach((key) => {
				const rule = additionalMap[key];
				if (typeof rule !== 'function') {
					return;
				}

				if (rules.has(key) && process.env.NODE_ENV !== 'production') {
					policyModuleReporter.warn(
						`Policy "${String(key)}" is being overridden via extend().`,
						{ policyKey: String(key) }
					);
				}

				rules.set(key, rule);
				asyncKeys.delete(key);
				cache.invalidate(String(key));
			});
		},
		cache,
	};

	const runtime = getPolicyRuntime();
	if (runtime) {
		runtime.policy = helpers as PolicyHelpers<Record<string, unknown>>;
	} else {
		(
			globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown }
		).__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: helpers as PolicyHelpers<Record<string, unknown>>,
		};
	}

	return helpers;
}
