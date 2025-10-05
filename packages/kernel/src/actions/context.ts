/**
 * Action execution context — internal helpers for creating ActionContext instances.
 *
 * This module provides the runtime machinery that powers action execution:
 * - Context creation with dependency injection
 * - Event emission (hooks + BroadcastChannel)
 * - Policy enforcement
 * - Job scheduling integration
 * - Structured logging
 *
 * @module @geekist/wp-kernel/actions/context
 * @internal
 */

import { KernelError } from '../error/KernelError';
import { invalidate as invalidateCache } from '../resource/cache';
import { getNamespace } from '../namespace/detect';
import { createPolicyProxy } from '../policy/context';
import type {
	ActionContext,
	ActionLifecycleEvent,
	ActionLifecycleEventBase,
	ActionOptions,
	ActionRuntime,
	Reporter,
	ResolvedActionOptions,
} from './types';

/**
 * Broadcast channel name for cross-tab action event coordination.
 *
 * Used to synchronize action lifecycle events across browser tabs, enabling
 * real-time UI updates and cross-tab coordination without polling.
 *
 * @internal
 */
const BROADCAST_CHANNEL_NAME = 'wpk.actions';

let broadcastChannel: BroadcastChannel | null | undefined;

/**
 * Lazily resolve the runtime configuration provided by host applications.
 *
 * Host apps can customize action behavior by setting `global.__WP_KERNEL_ACTION_RUNTIME__`
 * with custom reporters, job runners, policy engines, or event bridges.
 *
 * @return Runtime configuration if provided, otherwise undefined
 * @internal
 */
function getRuntime(): ActionRuntime | undefined {
	return globalThis.__WP_KERNEL_ACTION_RUNTIME__;
}

/**
 * Retrieve WordPress hooks API if available in the current environment.
 *
 * The hooks API (from `@wordpress/hooks`) is used to emit action lifecycle events
 * (`wpk.action.start`, `wpk.action.complete`, `wpk.action.error`) so that WordPress
 * plugins can observe actions and integrate with legacy PHP-side code.
 *
 * @return Hooks API object if available, otherwise null
 * @internal
 */
type WordPressHooks = {
	doAction: (eventName: string, payload: unknown) => void;
};

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
 * Merges user-provided action options with runtime defaults.
 *
 * Resolves the final configuration for an action by checking (in order):
 * 1. Options explicitly passed to `defineAction()`
 * 2. Runtime defaults from `__WP_KERNEL_ACTION_RUNTIME__`
 * 3. Framework defaults (crossTab scope, bridged=true for crossTab, bridged=false for tabLocal)
 *
 * This layered approach allows host applications to set global action behavior
 * while still permitting per-action overrides.
 *
 * The `bridged` flag controls whether lifecycle events are sent to the PHP bridge.
 * By default, tab-local actions are not bridged (bridged=false) since they represent
 * ephemeral UI state that doesn't need server coordination.
 *
 * @param options - User-provided options (may be partial or undefined)
 * @return Fully resolved options with scope, bridged, and lifecycle hooks
 * @internal
 *
 * @example
 * ```typescript
 * // Framework defaults
 * const opts = resolveOptions({}); // scope='crossTab', bridged=true
 *
 * // Tab-local action (not bridged by default)
 * const opts = resolveOptions({ scope: 'tabLocal' }); // bridged=false
 *
 * // Explicit override
 * const opts = resolveOptions({ scope: 'crossTab', bridged: false }); // bridged=false
 * ```
 */
export function resolveOptions(
	options: ActionOptions = {}
): ResolvedActionOptions {
	const scope = options.scope ?? 'crossTab';
	const bridged = scope === 'tabLocal' ? false : (options.bridged ?? true);
	return { scope, bridged };
}

/**
 * Generate a unique request identifier for action invocations.
 *
 * Each action invocation receives a unique ID that can be used for:
 * - Request tracing across distributed systems
 * - Correlation of lifecycle events (start/complete/error)
 * - De-duplication of broadcast events
 * - Debugging and observability
 *
 * The ID format is `act_{timestamp}_{random}`, providing both
 * human readability and uniqueness guarantees.
 *
 * @return Unique request ID string
 * @internal
 *
 * @example
 * ```typescript
 * generateActionRequestId();
 * // => "act_1704110400000_a3f9c2"
 * ```
 */
export function generateActionRequestId(): string {
	return `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a reporter for action lifecycle events.
 *
 * The reporter provides structured logging for action start, completion, and error events.
 * If the runtime provides a custom reporter, it's used; otherwise, falls back to console logging.
 *
 * This enables:
 * - Centralized logging to external observability tools (Sentry, Datadog, etc.)
 * - Structured event tracking for analytics
 * - Consistent action telemetry across the application
 *
 * @param runtime - Optional runtime configuration with custom reporter
 * @return Reporter instance for logging action events
 * @internal
 *
 * @example
 * ```typescript
 * // Using custom reporter
 * global.__WP_KERNEL_ACTION_RUNTIME__ = {
 *   reporter: {
 *     logActionStart: (ctx) => analytics.track('action.start', ctx),
 *     logActionComplete: (ctx, result) => analytics.track('action.complete', { ctx, result }),
 *     logActionError: (ctx, err) => sentry.captureException(err, { contexts: { action: ctx } })
 *   }
 * };
 *
 * // Falls back to console when no custom reporter provided
 * const reporter = createReporter();
 * reporter.logActionStart({ name: 'CreatePost', requestId: 'act_123' });
 * ```
 */
function createReporter(runtime?: ActionRuntime): Reporter {
	if (runtime?.reporter) {
		return runtime.reporter;
	}

	return {
		info(message, context) {
			console.info(`[wp-kernel] ${message}`, context ?? '');
		},
		warn(message, context) {
			console.warn(`[wp-kernel] ${message}`, context ?? '');
		},
		error(message, context) {
			console.error(`[wp-kernel] ${message}`, context ?? '');
		},
		debug(message, context) {
			console.debug(`[wp-kernel] ${message}`, context ?? '');
		},
	};
}

/**
 * Create policy integration helpers for authorization and validation.
 *
 * Policies allow actions to enforce authorization rules, validate user capabilities,
 * and gate access to sensitive operations. This function creates a policy surface
 * that actions can use to check permissions or enforce constraints.
 *
 * If the runtime provides a custom policy engine, it's used; otherwise, returns
 * a no-op implementation that always allows access (useful for development or
 * applications without authorization requirements).
 *
 * @param actionName - Name of the action being protected
 * @param runtime    - Optional runtime configuration with custom policy engine
 * @return Policy helpers for checking capabilities and enforcing rules
 * @internal
 *
 * @example
 * ```typescript
 * // With custom policy engine
 * global.__WP_KERNEL_ACTION_RUNTIME__ = {
 *   policy: {
 *     check: async (actionName, rule) => {
 *       const user = getCurrentUser();
 *       return user.hasCapability(rule);
 *     }
 *   }
 * };
 *
 * const policy = createPolicy('DeletePost');
 * await policy.check('delete_posts'); // Throws if user lacks capability
 *
 * // No-op fallback (always allows)
 * const policy = createPolicy('CreateDraft'); // No runtime provided
 * await policy.check('edit_posts'); // Always succeeds
 * ```
 */
/**
 * Create background job integration helpers for asynchronous work.
 *
 * Jobs enable actions to schedule background work (email sending, data processing,
 * webhook delivery) without blocking the main request thread. This function creates
 * a jobs surface that actions can use to enqueue and wait for background tasks.
 *
 * If the runtime provides a custom jobs engine, it's used; otherwise, throws
 * actionable errors indicating that job functionality requires runtime configuration.
 *
 * @param actionName - Name of the action scheduling jobs
 * @param runtime    - Optional runtime configuration with custom jobs engine
 * @return Job helpers for enqueuing and awaiting background tasks
 * @internal
 *
 * @example
 * ```typescript
 * // With custom jobs engine
 * global.__WP_KERNEL_ACTION_RUNTIME__ = {
 *   jobs: {
 *     enqueue: async (jobName, payload) => {
 *       await jobQueue.add(jobName, payload);
 *     },
 *     wait: async (jobName) => {
 *       return jobQueue.waitFor(jobName);
 *     }
 *   }
 * };
 *
 * const jobs = createJobs('SendWelcomeEmail');
 * await jobs.enqueue('email.send', { to: 'user@example.com', template: 'welcome' });
 *
 * // Without runtime (throws descriptive error)
 * const jobs = createJobs('ProcessData');
 * await jobs.enqueue('data.process'); // Throws NotImplementedError with config guidance
 * ```
 */
function createJobs(actionName: string, runtime?: ActionRuntime) {
	if (runtime?.jobs) {
		return runtime.jobs;
	}

	return {
		async enqueue(jobName: string): Promise<void> {
			throw new KernelError('NotImplementedError', {
				message: `Action \"${actionName}\" attempted to enqueue job \"${jobName}\" but no jobs runtime is configured.`,
			});
		},
		async wait(jobName: string): Promise<never> {
			throw new KernelError('NotImplementedError', {
				message: `Action \"${actionName}\" attempted to wait on job \"${jobName}\" but no jobs runtime is configured.`,
			});
		},
	};
}

/**
 * Emit action lifecycle events across multiple channels (hooks, bridge, broadcast).
 *
 * This is the core event distribution mechanism for the Actions system. When an action
 * reaches a lifecycle phase (start/complete/error), this function broadcasts the event to:
 *
 * 1. **WordPress Hooks API** (`@wordpress/hooks`) - For WordPress plugin integration
 * 2. **PHP Bridge** (optional) - For server-side event handling (if `bridged=true`)
 * 3. **BroadcastChannel** (optional) - For cross-tab coordination (if `scope='crossTab'`)
 *
 * This multi-channel approach enables:
 * - Legacy WordPress plugins to observe actions via familiar hooks
 * - Server-side PHP code to react to client actions
 * - Real-time UI synchronization across browser tabs
 *
 * @param event - Lifecycle event to emit (start, complete, or error)
 * @internal
 *
 * @example
 * ```typescript
 * // Emit action start event
 * emitLifecycleEvent({
 *   phase: 'start',
 *   name: 'CreatePost',
 *   requestId: 'act_123',
 *   namespace: 'core',
 *   timestamp: Date.now(),
 *   bridged: true,
 *   scope: 'crossTab'
 * });
 *
 * // This emits to:
 * // - wp.hooks.doAction('wpk.action.start', event)
 * // - runtime.bridge.emit('wpk.action.start', event) [if bridged=true]
 * // - broadcastChannel.postMessage(event) [if scope='crossTab']
 * ```
 */
export function emitLifecycleEvent(event: ActionLifecycleEvent): void {
	const hooks = getHooks();
	if (hooks?.doAction) {
		hooks.doAction(`wpk.action.${event.phase}`, event);
	}

	const runtime = getRuntime();
	if (event.bridged && runtime?.bridge?.emit) {
		runtime.bridge.emit(`wpk.action.${event.phase}`, event, event);
	}

	if (event.scope === 'crossTab') {
		const channel = getBroadcastChannel();
		channel?.postMessage({ type: 'wpk.action.lifecycle', event });
	}
}

/**
 * Lazily construct or reuse a BroadcastChannel instance for cross-tab messaging.
 *
 * BroadcastChannel enables real-time synchronization of action events across browser tabs
 * without requiring a server connection or polling. The channel is created on first use
 * and reused for all subsequent events.
 *
 * Falls back to null in environments where BroadcastChannel is not available (Node.js,
 * older browsers, or when the API is explicitly disabled).
 *
 * @return BroadcastChannel instance if available, otherwise null
 * @internal
 */
function getBroadcastChannel(): BroadcastChannel | null {
	if (broadcastChannel !== undefined) {
		return broadcastChannel;
	}

	if (
		typeof window === 'undefined' ||
		typeof window.BroadcastChannel !== 'function'
	) {
		broadcastChannel = null;
		return broadcastChannel;
	}

	broadcastChannel = new window.BroadcastChannel(BROADCAST_CHANNEL_NAME);
	return broadcastChannel;
}

/**
 * Emit a domain event from an action, respecting scope and bridge configuration.
 *
 * Domain events represent business-level state changes triggered by actions
 * (e.g., "post.created", "user.registered"). Unlike lifecycle events (which track
 * action execution phases), domain events communicate semantic outcomes to the rest
 * of the application.
 *
 * Like lifecycle events, domain events are distributed across multiple channels:
 * - WordPress Hooks API for plugin integration
 * - PHP Bridge (if `bridged=true`) for server-side handlers
 * - BroadcastChannel (if `scope='crossTab'`) for cross-tab coordination
 *
 * @param eventName - Domain event name (e.g., "post.created", "user.updated")
 * @param payload   - Event payload containing relevant data
 * @param metadata  - Action metadata (namespace, scope, bridged, requestId)
 * @internal
 *
 * @example
 * ```typescript
 * // From within an action function
 * async function CreatePost(input, ctx) {
 *   const post = await api.posts.create(input);
 *
 *   // Emit domain event
 *   ctx.emit('post.created', { postId: post.id, title: post.title });
 *
 *   return post;
 * }
 * ```
 */
function emitDomainEvent(
	eventName: string,
	payload: unknown,
	metadata: ActionLifecycleEventBase
) {
	if (!eventName || typeof eventName !== 'string') {
		throw new KernelError('DeveloperError', {
			message: 'ctx.emit requires a non-empty string event name.',
		});
	}

	const eventMetadata: ActionLifecycleEventBase = {
		...metadata,
		timestamp: Date.now(),
	};

	const hooks = getHooks();
	if (hooks?.doAction) {
		hooks.doAction(eventName, payload);
	}

	const runtime = getRuntime();
	if (eventMetadata.bridged && runtime?.bridge?.emit) {
		runtime.bridge.emit(eventName, payload, eventMetadata);
	}

	if (eventMetadata.scope === 'crossTab') {
		const channel = getBroadcastChannel();
		channel?.postMessage({
			type: 'wpk.action.event',
			event: eventName,
			payload,
			metadata: eventMetadata,
		});
	}
}

/**
 * Build the complete action execution context exposed to action implementations.
 *
 * The ActionContext is the primary API surface that actions interact with. It provides:
 * - Event emission (`ctx.emit`) for domain events
 * - Cache invalidation (`ctx.invalidate`) for resource stores
 * - Background job scheduling (`ctx.jobs`) for async work
 * - Authorization checks (`ctx.policy`) for capability enforcement
 * - Structured logging (`ctx.reporter`) for observability
 * - Identity metadata (`ctx.namespace`, `ctx.requestId`) for tracing
 *
 * This function assembles the context by wiring together runtime integrations
 * (reporter, jobs, policy) and binding them to the current action invocation.
 *
 * @param actionName - Name of the action being executed
 * @param requestId  - Unique identifier for this action invocation
 * @param options    - Resolved action options (scope, bridged)
 * @return Complete ActionContext instance with all integration surfaces
 * @internal
 *
 * @example
 * ```typescript
 * const ctx = createActionContext('CreatePost', 'act_123', { scope: 'crossTab', bridged: true });
 *
 * // Actions receive this context as their second parameter
 * async function CreatePost(input, ctx) {
 *   ctx.reporter.info('Creating post', { input });
 *   const post = await api.posts.create(input);
 *   ctx.emit('post.created', { postId: post.id });
 *   ctx.invalidate(['posts']);
 *   return post;
 * }
 * ```
 */
export function createActionContext(
	actionName: string,
	requestId: string,
	options: ResolvedActionOptions
): ActionContext {
	const runtime = getRuntime();
	const namespace = getNamespace();
	const metadata: ActionLifecycleEventBase = {
		actionName,
		requestId,
		namespace,
		scope: options.scope,
		bridged: options.bridged,
		timestamp: Date.now(),
	};

	const reporter = createReporter(runtime);
	const policy = createPolicyProxy({
		actionName,
		requestId,
		namespace,
		scope: options.scope,
		bridged: options.bridged,
	});
	const jobs = createJobs(actionName, runtime);

	return {
		requestId,
		namespace,
		reporter,
		policy,
		jobs,
		emit(eventName, payload) {
			emitDomainEvent(eventName, payload, metadata);
		},
		invalidate(patterns, opts) {
			invalidateCache(patterns, opts);
		},
	};
}

export { getHooks };
