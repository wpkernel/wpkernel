/**
 * Redux-compatible middleware for executing WP Kernel actions through Redux stores.
 *
 * This module provides Redux/`@wordpress/data` integration, enabling actions to be
 * dispatched through store middleware pipelines. This is the recommended approach for
 * WordPress block editor environments where Redux stores are the primary state mechanism.
 *
 * ## Key Concepts
 *
 * - **Action Envelope**: A special Redux action wrapper that carries a kernel action
 *   and its arguments through the middleware pipeline.
 * - **Middleware Interception**: The middleware intercepts action envelopes, executes
 *   the underlying kernel action, and returns the result (bypassing the reducer).
 * - **Seamless Integration**: Works with existing Redux middleware chains and doesn't
 *   interfere with standard Redux actions.
 *
 * @module actions/middleware
 * @see createActionMiddleware For setting up the middleware
 * @see invokeAction For dispatching actions through Redux
 *
 * @example
 * ```typescript
 * import { createStore, applyMiddleware } from 'redux';
 * import { createActionMiddleware, invokeAction } from '@geekist/wp-kernel';
 * import { CreatePost } from './actions/CreatePost';
 *
 * // Setup Redux store with action middleware
 * const actionMiddleware = createActionMiddleware();
 * const store = createStore(rootReducer, applyMiddleware(actionMiddleware));
 *
 * // Dispatch actions through Redux
 * const envelope = invokeAction(CreatePost, { title: 'Hello', content: '...' });
 * const result = await store.dispatch(envelope);
 * ```
 */

import type { DefinedAction, ReduxDispatch, ReduxMiddleware } from './types';

/**
 * Internal marker used to identify kernel action envelopes in the Redux pipeline.
 *
 * This type constant ensures that action envelopes don't collide with standard
 * Redux actions. The `@@` prefix follows Redux's convention for internal actions.
 *
 * @internal
 */
const EXECUTE_ACTION_TYPE = '@@wp-kernel/EXECUTE_ACTION';

/**
 * Shape of the action envelope dispatched through Redux middleware.
 *
 * Action envelopes wrap kernel actions in a Redux-compatible format, carrying:
 * - The action function itself (`payload.action`)
 * - The arguments to invoke it with (`payload.args`)
 * - Optional metadata for middleware coordination (`meta`)
 * - A marker flag for runtime type checking (`__kernelAction`)
 *
 * @template TArgs - Input type for the action
 * @template TResult - Return type from the action
 */
export type ActionEnvelope<TArgs, TResult> = {
	type: typeof EXECUTE_ACTION_TYPE;
	payload: {
		action: DefinedAction<TArgs, TResult>;
		args: TArgs;
	};
	meta?: Record<string, unknown>;
	__kernelAction: true;
};

/**
 * Type guard to identify action envelopes at runtime.
 *
 * Checks if a Redux action is actually a kernel action envelope by verifying:
 * 1. It's an object with the correct `type` constant
 * 2. It has the `__kernelAction` marker flag
 *
 * This enables the middleware to selectively intercept kernel actions while
 * allowing standard Redux actions to pass through untouched.
 *
 * @param value - Potential action envelope
 * @return True if value is a valid action envelope
 * @internal
 */
function isActionEnvelope<TArgs, TResult>(
	value: unknown
): value is ActionEnvelope<TArgs, TResult> {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { type?: unknown }).type === EXECUTE_ACTION_TYPE &&
		(value as { __kernelAction?: unknown }).__kernelAction === true
	);
}

/**
 * Create a Redux-compatible middleware that intercepts and executes kernel actions.
 *
 * This middleware enables actions to be dispatched through Redux/`@wordpress/data` stores.
 * When an action envelope is dispatched, the middleware:
 * 1. Intercepts the envelope before it reaches reducers
 * 2. Extracts the action function and arguments
 * 3. Executes the action (triggering lifecycle events, cache invalidation, etc.)
 * 4. Returns the action's result (bypassing the reducer)
 *
 * Standard Redux actions pass through untouched, ensuring compatibility with existing
 * store logic.
 *
 * @template TState - Redux store state type
 * @return Redux middleware function
 *
 * @example
 * ```typescript
 * // With Redux
 * import { createStore, applyMiddleware } from 'redux';
 *
 * const actionMiddleware = createActionMiddleware();
 * const store = createStore(rootReducer, applyMiddleware(actionMiddleware));
 *
 * // With @wordpress/data
 * import { register } from '@wordpress/data';
 *
 * const actionMiddleware = createActionMiddleware();
 * register({
 *   reducer: rootReducer,
 *   actions: {},
 *   selectors: {},
 *   controls: {},
 *   __experimentalUseMiddleware: () => [actionMiddleware]
 * });
 *
 * // Dispatching actions
 * import { invokeAction } from '@geekist/wp-kernel';
 * import { CreatePost } from './actions/CreatePost';
 *
 * const envelope = invokeAction(CreatePost, { title: 'Hello', content: '...' });
 * const result = await store.dispatch(envelope); // Returns post object
 * ```
 */
export function createActionMiddleware<
	TState = unknown,
>(): ReduxMiddleware<TState> {
	return () => (next: ReduxDispatch) => (action: unknown) => {
		if (isActionEnvelope(action)) {
			const {
				payload: { action: definedAction, args },
			} = action;
			const promise = definedAction(args);
			return promise;
		}
		return next(action);
	};
}

/**
 * Create an action envelope for dispatching a kernel action through Redux.
 *
 * This function wraps a kernel action and its arguments in a Redux-compatible format
 * that the action middleware can intercept and execute. The resulting envelope can be
 * passed to `store.dispatch()` just like any standard Redux action.
 *
 * ## Why Use Envelopes?
 *
 * - **Redux Integration**: Enables actions to flow through existing Redux middleware chains
 * - **Type Safety**: Preserves TypeScript types for arguments and return values
 * - **Metadata**: Allows attaching middleware coordination data (correlation IDs, etc.)
 * - **Compatibility**: Works alongside standard Redux actions without interference
 *
 * @template TArgs - Input type for the action
 * @template TResult - Return type from the action
 * @param    action - The defined kernel action to execute
 * @param    args   - Arguments to pass to the action function
 * @param    meta   - Optional metadata for middleware coordination
 * @return Action envelope ready for Redux dispatch
 *
 * @example
 * ```typescript
 * import { invokeAction } from '@geekist/wp-kernel';
 * import { CreatePost } from './actions/CreatePost';
 *
 * // Basic usage
 * const envelope = invokeAction(CreatePost, {
 *   title: 'My First Post',
 *   content: 'Hello world!'
 * });
 * const post = await store.dispatch(envelope);
 *
 * // With metadata
 * const envelope = invokeAction(
 *   CreatePost,
 *   { title: 'Post', content: '...' },
 *   { correlationId: 'req-123', source: 'editor-ui' }
 * );
 * const post = await store.dispatch(envelope);
 * ```
 */
export function invokeAction<TArgs, TResult>(
	action: DefinedAction<TArgs, TResult>,
	args: TArgs,
	meta: Record<string, unknown> = {}
): ActionEnvelope<TArgs, TResult> {
	return {
		type: EXECUTE_ACTION_TYPE,
		payload: { action, args },
		meta,
		__kernelAction: true,
	};
}

export { EXECUTE_ACTION_TYPE };
