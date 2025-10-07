/**
 * Action module type definitions.
 *
 * Provides shared interfaces used across the actions runtime including:
 * - **ActionContext**: The primary API surface exposed to action implementations
 * - **Action Options**: Configuration for event scope and PHP bridge integration
 * - **Lifecycle Events**: Type definitions for start/complete/error events
 * - **Integration Surfaces**: Reporter, jobs, and policy helpers
 * - **Redux Middleware**: Type-safe Redux/`@wordpress/data` integration
 *
 * These types form the contract between action implementations and the kernel runtime,
 * enabling type-safe orchestration with IDE autocomplete and compile-time validation.
 *
 * @module actions/types
 */

import type { CacheKeyPattern } from '../resource/cache';
import type { PolicyHelpers } from '../policy/types';
import type { Reporter } from '../reporter';

/**
 * Structured logging interface for action observability.
 *
 * Provided by the reporter module to ensure a single source of truth for
 * transports and formatting while keeping the public type available here.
 */
export type { Reporter } from '../reporter';

/**
 * Configuration options controlling action event propagation and bridging.
 *
 * Actions can be configured to:
 * - Broadcast events across browser tabs (`scope: 'crossTab'`)
 * - Keep events local to the current tab (`scope: 'tabLocal'`)
 * - Bridge lifecycle events to PHP server (`bridged: true`)
 * - Skip PHP bridge for ephemeral UI actions (`bridged: false`)
 *
 * @example
 * ```typescript
 * // Cross-tab action with PHP bridge (default for mutations)
 * defineAction('CreatePost', impl, { scope: 'crossTab', bridged: true });
 *
 * // Tab-local UI action (no PHP bridge)
 * defineAction('ToggleSidebar', impl, { scope: 'tabLocal' }); // bridged=false automatically
 * ```
 */
export type ActionOptions = {
	/** Event scope: whether events broadcast cross-tab or stay in current tab. */
	scope?: 'crossTab' | 'tabLocal';
	/** Whether to bridge lifecycle events to PHP server. Ignored when scope is tabLocal. */
	bridged?: boolean;
};

/**
 * Resolved action options with framework defaults applied.
 *
 * After resolution:
 * - `scope` defaults to 'crossTab'
 * - `bridged` defaults to true for crossTab, false for tabLocal
 *
 * @internal
 */
export type ResolvedActionOptions = {
	scope: 'crossTab' | 'tabLocal';
	bridged: boolean;
};

/**
 * Options for waiting on a background job.
 */
export type WaitOptions = {
	timeoutMs?: number;
	pollIntervalMs?: number;
};

/**
 * Background job orchestration interface for asynchronous work.
 *
 * Actions use this interface to schedule and wait for background jobs (email sending,
 * data processing, webhook delivery). The actual job execution is handled by the runtime
 * job engine provided by the host application.
 *
 * @example
 * ```typescript
 * async function SendWelcomeEmail(ctx, { userId }) {
 *   // Enqueue background job
 *   await ctx.jobs.enqueue('email.send', {
 *     to: user.email,
 *     template: 'welcome',
 *     userId
 *   });
 *
 *   // Or wait for job completion
 *   const result = await ctx.jobs.wait('email.send', payload, {
 *     timeoutMs: 30000,
 *     pollIntervalMs: 1000
 *   });
 * }
 * ```
 */
export type ActionJobs = {
	enqueue: <TPayload>(jobName: string, payload: TPayload) => Promise<void>;
	wait: <TPayload, TResult>(
		jobName: string,
		payload: TPayload,
		options?: WaitOptions
	) => Promise<TResult>;
};

/**
 * Authorization and capability checking interface for actions.
 *
 * Actions use this interface to enforce authorization rules and validate user capabilities.
 * The actual policy enforcement is handled by the runtime policy engine provided by the
 * host application (which typically integrates with WordPress capabilities).
 *
 * @example
 * ```typescript
 * async function DeletePost(ctx, { postId }) {
 *   // Assert capability (throws if user lacks permission)
 *   ctx.policy.assert('delete_posts');
 *
 *   // Or check capability conditionally
 *   if (!ctx.policy.can('delete_others_posts')) {
 *     // Only allow deleting own posts
 *     const post = await api.posts.get(postId);
 *     if (post.authorId !== currentUser.id) {
 *       throw new KernelError('UnauthorizedError', {
 *         message: 'Cannot delete posts by other authors'
 *       });
 *     }
 *   }
 *
 *   await api.posts.delete(postId);
 * }
 * ```
 */
/**
 * Base metadata shared across all action lifecycle events.
 *
 * This metadata is attached to every lifecycle event (start/complete/error) and
 * domain event emitted by actions, enabling:
 * - Request tracing and correlation
 * - Cross-tab event de-duplication
 * - PHP bridge integration
 * - Observability and debugging
 *
 * @internal
 */
export type ActionLifecycleEventBase = {
	actionName: string;
	requestId: string;
	namespace: string;
	scope: 'crossTab' | 'tabLocal';
	bridged: boolean;
	timestamp: number;
};

/**
 * Lifecycle event emitted when an action starts execution.
 *
 * Emitted immediately before the action function is invoked, enabling:
 * - Pre-execution hooks for logging or analytics
 * - Loading states in UI components
 * - Request correlation across distributed systems
 *
 * Event name: `wpk.action.start`
 */
export type ActionStartEvent = {
	phase: 'start';
	args: unknown;
} & ActionLifecycleEventBase;

/**
 * Lifecycle event emitted when an action completes successfully.
 *
 * Emitted after the action function returns, enabling:
 * - Success notifications and toasts
 * - Performance monitoring and metrics
 * - Post-execution hooks for analytics
 *
 * Event name: `wpk.action.complete`
 */
export type ActionCompleteEvent = {
	phase: 'complete';
	result: unknown;
	durationMs: number;
} & ActionLifecycleEventBase;

/**
 * Lifecycle event emitted when an action fails.
 *
 * Emitted when the action function throws an error, enabling:
 * - Error notifications and reporting
 * - Retry logic and fallback behavior
 * - Error tracking in observability tools
 *
 * Event name: `wpk.action.error`
 */
export type ActionErrorEvent = {
	phase: 'error';
	error: unknown;
	durationMs: number;
} & ActionLifecycleEventBase;

/**
 * Union type of all lifecycle events emitted by actions.
 *
 * Actions emit three lifecycle phases:
 * - `start` - Before action execution begins
 * - `complete` - After successful execution
 * - `error` - After execution fails
 *
 * Observers can listen to these events via:
 * - WordPress hooks (`wp.hooks.addAction('wpk.action.start', handler)`)
 * - PHP bridge (`add_action('wpk.action.start', 'my_handler')`)
 * - BroadcastChannel (for cross-tab coordination)
 */
export type ActionLifecycleEvent =
	| ActionStartEvent
	| ActionCompleteEvent
	| ActionErrorEvent;

/**
 * Primary API surface passed to action implementations.
 *
 * The ActionContext provides actions with all the integration points they need:
 * - Event emission for domain events
 * - Cache invalidation for resource stores
 * - Background job scheduling
 * - Authorization checks
 * - Structured logging
 * - Identity metadata (requestId, namespace)
 *
 * This is the second parameter to every action function.
 *
 * @example
 * ```typescript
 * async function CreatePost(ctx: ActionContext, input: CreatePostInput) {
 *   // Authorization
 *   ctx.policy.assert('edit_posts');
 *
 *   // Logging
 *   ctx.reporter.info('Creating post', { input });
 *
 *   // Resource mutation
 *   const post = await api.posts.create(input);
 *
 *   // Domain event
 *   ctx.emit('post.created', { postId: post.id });
 *
 *   // Cache invalidation
 *   ctx.invalidate(['posts', `post:${post.id}`]);
 *
 *   // Background job
 *   await ctx.jobs.enqueue('email.notification', { postId: post.id });
 *
 *   return post;
 * }
 * ```
 */
export type ActionContext = {
	/** Correlation identifier shared with transport calls. */
	readonly requestId: string;
	/** Emit canonical events. */
	emit: (eventName: string, payload: unknown) => void;
	/** Invalidate cache keys. */
	invalidate: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: { storeKey?: string; emitEvent?: boolean }
	) => void;
	/** Background job helpers. */
	readonly jobs: ActionJobs;
	/** Policy enforcement helpers. */
	readonly policy: Pick<
		PolicyHelpers<Record<string, unknown>>,
		'assert' | 'can'
	>;
	/** Structured logging surface. */
	readonly reporter: Reporter;
	/** Resolved namespace of the current action. */
	readonly namespace: string;
};

/**
 * Function signature for action implementations.
 *
 * Actions are async functions that receive:
 * 1. **Context** (`ctx`) - Integration surfaces (emit, invalidate, jobs, policy, reporter)
 * 2. **Arguments** (`args`) - Input data provided by the caller
 *
 * And return a Promise resolving to the action's result.
 *
 * @template TArgs - Input type (arguments passed to the action)
 * @template TResult - Return type (value returned by the action)
 *
 * @example
 * ```typescript
 * // Simple action
 * const CreatePost: ActionFn<CreatePostInput, Post> = async (ctx, input) => {
 *   const post = await api.posts.create(input);
 *   ctx.emit('post.created', { postId: post.id });
 *   ctx.invalidate(['posts']);
 *   return post;
 * };
 * ```
 */
export type ActionFn<TArgs, TResult> = (
	ctx: ActionContext,
	args: TArgs
) => Promise<TResult>;

/**
 * Callable action returned by `defineAction()`.
 *
 * After wrapping with `defineAction()`, actions become callable functions that:
 * - Accept only the arguments (context is injected automatically)
 * - Return a Promise with the action result
 * - Emit lifecycle events automatically
 * - Include metadata (actionName, options) as readonly properties
 *
 * @template TArgs - Input type (arguments passed to the action)
 * @template TResult - Return type (value returned by the action)
 *
 * @example
 * ```typescript
 * const CreatePost = defineAction('CreatePost', async (ctx, input) => {
 *   // implementation
 * });
 *
 * // Usage
 * const post = await CreatePost({ title: 'Hello', content: '...' });
 *
 * // Metadata access
 * console.log(CreatePost.actionName); // "CreatePost"
 * console.log(CreatePost.options.scope); // "crossTab"
 * ```
 */
export type DefinedAction<TArgs, TResult> = {
	(args: TArgs): Promise<TResult>;
	readonly actionName: string;
	readonly options: ResolvedActionOptions;
};

/**
 * Redux compatible dispatch signature (duck-typed from Redux types).
 */
export type ReduxDispatch = (action: unknown) => unknown;

/**
 * Redux compatible middleware API signature.
 */
export type ReduxMiddlewareAPI<TState = unknown> = {
	dispatch: ReduxDispatch;
	getState: () => TState;
};

/**
 * Redux compatible middleware type without depending on redux package.
 */
export type ReduxMiddleware<TState = unknown> = (
	api: ReduxMiddlewareAPI<TState>
) => (next: ReduxDispatch) => (action: unknown) => unknown;

/**
 * Runtime configuration surface for host applications.
 *
 * Host applications can customize action behavior by setting:
 * ```typescript
 * global.__WP_KERNEL_ACTION_RUNTIME__ = {
 *   reporter: customReporter,
 *   jobs: customJobEngine,
 *   policy: customPolicyEngine,
 *   bridge: customPhpBridge
 * };
 * ```
 *
 * This enables:
 * - Routing logs to external observability tools
 * - Integrating with custom job queues
 * - Enforcing WordPress capabilities
 * - Bridging events to PHP server-side code
 *
 * @internal
 */
export type ActionRuntime = {
	reporter?: Reporter;
	jobs?: ActionJobs;
	policy?: Partial<PolicyHelpers<Record<string, unknown>>>;
	bridge?: {
		emit: (
			eventName: string,
			payload: unknown,
			metadata: ActionLifecycleEventBase
		) => void;
	};
};

declare global {
	var __WP_KERNEL_ACTION_RUNTIME__: ActionRuntime | undefined;
}
