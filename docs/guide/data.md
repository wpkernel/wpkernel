# WordPress Data Integration

WP Kernel ships first-class helpers for wiring actions and resources into `@wordpress/data`. The goal is to make registries aware of actions, errors, and notices without duplicating glue code in every plugin.

## What WP Kernel provides (for plugin & theme authors)

WP Kernel standardizes how plugins and themes interact with data, actions, events, jobs, and error reporting:

- **Typed actions system** – Actions are first-class functions you can dispatch and observe through lifecycle and domain events.
- **Resource system** – Define REST-backed resources once and get stores, cache helpers, fetch/prefetch utilities, and events for free.
- **Events and reporting** – Lifecycle events, domain events, reporter integrations, and cross-tab sync keep behaviour observable.
- **WordPress data integration** – Helpers that connect kernel runtime features to `@wordpress/data` registries with minimal boilerplate.
- **Background jobs** – Roadmap feature (Sprint 6) that will let actions enqueue durable background work via `defineJob()`.
- **PHP bridge** – Roadmap feature (Sprint 9) to mirror events into PHP for legacy plugin interoperability.

The UI hooks in `@geekist/wp-kernel-ui` are the activation point for these systems inside React/WordPress experiences.

## `useKernel(registry, options)` – bootstrap the runtime

`useKernel` is the primary integration helper that plugin and theme authors call to wire the kernel runtime into an `@wordpress/data` registry. It is intentionally usable by host applications (plugins/themes), not just internal framework code.

### What `useKernel` does

Calling `useKernel(registry, options)` enables the kernel runtime on that registry:

- **Installs action execution middleware** – Dispatch envelopes from `invokeAction()` and get full ActionContext (policy checks, lifecycle events, reporter wiring, cache invalidation, and planned job hooks _(Roadmap: Sprint 6)_).
- **Installs the kernel events plugin** – Bridges action lifecycle events to `wp.hooks`, forwards actionable errors to `core/notices.createNotice`, and reports to your configured `Reporter`.
- **Accepts additional middleware** – Pass `{ middleware: [myMiddleware] }` to append custom middleware after the kernel handler.
- **Returns a cleanup function** – Remove middleware and detach WP hooks, which keeps hot reloads, tests, and SPA lifecycles stable.

### Why authors should call `useKernel`

1. **Single-step activation of kernel behaviours** – Skip writing bespoke middleware or notice plumbing; `useKernel` installs the tested integration.
2. **Leverage the ActionContext** – Actions executed through the middleware gain policy enforcement, lifecycle events, domain events via `ctx.emit`, cross-tab broadcast, cache invalidation, reporter logging, and future background job coordination _(Roadmap: Sprint 6)_.
3. **Native WordPress experience** – Lifecycle and domain events are bridged into `wp.hooks` so PHP-side plugins or other JS code can observe them, keeping backwards compatibility.
4. **Consistent error handling** – Kernel errors map into WordPress notices automatically while still logging structured context through the reporter.
5. **Cross-tab and bridge support** – `scope: 'crossTab'` actions sync via `BroadcastChannel`. When the PHP bridge lands _(Roadmap: Sprint 9)_, the same events will be mirrored server-side.
6. **Extensible middleware** – Custom middleware and reporters plug into the runtime without reimplementing the action pipeline.

### Practical examples

#### Minimal bootstrap (plugin entry point)

```ts
import { useKernel } from '@geekist/wp-kernel-ui';
import { registerKernelStore } from '@geekist/wp-kernel/data';

export function bootstrap(registry) {
	const teardown = useKernel(registry, {
		namespace: 'my-plugin',
	});

	registerKernelStore('my-plugin/items', {
		reducer: itemsReducer,
		actions: {
			/* actions for local state */
		},
		selectors: {
			/* selectors */
		},
		controls: {},
	});

	return teardown;
}
```

#### Dispatch kernel actions via a store

```ts
import { invokeAction } from '@geekist/wp-kernel/actions';
import { CreateItem } from './actions/CreateItem';

export async function createItemViaStore(store, payload) {
	const envelope = invokeAction(CreateItem, payload);
	const result = await store.dispatch(envelope);
	return result;
}
```

#### Automatic notices & reporting

If `CreateItem` throws `KernelError('ValidationError', { message: 'Bad input' })`, then after `useKernel(registry)` runs:

- `core/notices.createNotice('info', 'Bad input')` fires when the store is registered.
- The configured reporter receives `error(...)` with contextual metadata.

#### Add tracing middleware

```ts
const metricsMiddleware = () => (next) => async (action) => {
	const start = performance.now();
	const result = await next(action);
	console.debug('action', action.type, 'took', performance.now() - start);
	return result;
};

const teardown = useKernel(registry, { middleware: [metricsMiddleware] });
```

#### Custom reporter

```ts
import { useKernel } from '@geekist/wp-kernel-ui';
import { createReporter } from '@geekist/wp-kernel/reporter';

const reporter = createReporter({
	namespace: 'my-plugin',
	channel: 'console',
	level: 'debug',
});

useKernel(registry, { reporter });
```

#### PHP / WP hooks listeners

`useKernel` forwards action events into `wp.hooks`, so a PHP plugin can listen:

```php
add_action( 'wpk.action.error', 'my_plugin_handle_action_error', 10, 1 );
function my_plugin_handle_action_error( $payload ) {
        // Contains actionName, requestId, namespace, and error metadata.
}
```

### Edge cases & limitations

- **Registry support** – No-op when `__experimentalUseMiddleware` is missing (older `@wordpress/data`).
- **Missing hooks** – If `window.wp?.hooks` is absent, lifecycle events stay internal.
- **Notice dependencies** – Without `core/notices`, notice forwarding is skipped but reporter logging stays active.
- **BroadcastChannel** – Absent in SSR or older browsers; cross-tab sync degrades gracefully.
- **Runtime configuration** – Policy engines and reporters rely on runtime wiring. Background jobs and PHP bridge integrations will arrive with future roadmap sprints.
- **Middleware ordering** – Custom middleware runs after the kernel middleware. Ensure ordering aligns with your instrumentation requirements.

### Best practices

- Call `useKernel(registry)` once per registry at bootstrap; it is idempotent for typical usage.
- Register stores via `registerKernelStore()` so they inherit kernel-aware behaviour.
- Throw `KernelError` subclasses from actions for structured notice mapping.
- Provide a production reporter to forward logs to your telemetry system.
- Retain the teardown function for tests and hot module replacement.

### Summary

`useKernel` is the framework’s public bootstrapping API. Calling it enables participation in the kernel ecosystem: typed actions, lifecycle & domain events bridged to `wp.hooks`, automatic notices, cross-tab coordination, extensible middleware, and upcoming job/bridge integrations. Plugin authors gain consistency and interoperability without bespoke wiring.

## `usePolicy()` – gate UI with runtime capabilities

`usePolicy` gives components access to the active policy runtime so UI can conditionally render based on capabilities.

### What `usePolicy` does

- Subscribes to the policy cache so capability decisions stay reactive.
- Exposes `can(key, ...params)` to evaluate policy helpers.
- Surfaces `keys`, `isLoading`, and `error` for loading/error states.
- Emits developer-friendly errors when no policy runtime is wired (remember to call `definePolicy()` during bootstrap).

### Why authors should use `usePolicy`

1. **Policy-driven UX** – Render controls only when authorised, using the same rules as action execution.
2. **Shared cache** – Reads from the kernel’s policy cache, including cross-tab synchronisation.
3. **Consistency** – Keeps UI behaviour aligned with policy enforcement in the action layer.
4. **Graceful loading** – Reflects `isLoading` and `error` so you can show skeletons or fallback messages.

### Example

```ts
import { usePolicy } from '@geekist/wp-kernel-ui';
import type { PolicyKeys } from '../policies';

export function DeleteButton({ postId }) {
        const { can, isLoading, error } = usePolicy<PolicyKeys>();
        const allowed = can('posts.delete', { postId });

        if (isLoading) {
                return <Spinner />;
        }
        if (!allowed) {
                return null;
        }
        if (error) {
                return <Notice status="warning">{error.message}</Notice>;
        }

        return <ActionButton action={DeletePost} args={{ postId }} />;
}
```

### Edge cases

- Ensure a policy runtime is registered via `definePolicy()` inside your kernel bootstrap.
- `usePolicy` returns `false` until hydration completes; design loading states accordingly.
- Async `can()` helpers resolve to `false` while pending but propagate errors for observability.

### Summary

Use `usePolicy` to keep UI affordances in sync with capability checks. It leans on the shared policy runtime so action execution and UI gating stay consistent.

## Resource hooks – `useGet` and `useList`

Resource definitions automatically gain `useGet` and `useList` when the UI bundle is loaded. These hooks wrap `@wordpress/data` selectors and lifecycle helpers for you.

### What they provide

- **`useGet(id)`** – Reads a single entity, returning `{ data, isLoading, error }` based on store resolution state.
- **`useList(query)`** – Reads collection data with loading/error signals derived from resolver status.
- **Automatic store hydration** – Accessing the hook ensures the resource store is registered (no manual imports).
- **WordPress awareness** – Hooks require `@wordpress/data.useSelect`; they throw a helpful `KernelError` when unavailable.

### Example

```ts
import { defineResource } from '@geekist/wp-kernel/resource';

export const Posts = defineResource({
        name: 'Posts',
        routes: {
                get: { path: '/wp/v2/posts/:id' },
                list: { path: '/wp/v2/posts' },
        },
});

function PostList() {
        const { data, isLoading, error } = Posts.useList({ per_page: 5 });

        if (isLoading) {
                return <Spinner />;
        }
        if (error) {
                return <Notice status="error">{error}</Notice>;
        }
        if (!data?.items?.length) {
                return <EmptyState>No posts yet.</EmptyState>;
        }

        return (
                <ul>
                        {data.items.map((post) => (
                                <li key={post.id}>{post.title.rendered}</li>
                        ))}
                </ul>
        );
}
```

### Edge cases

- Hooks throw a `DeveloperError` when `@wordpress/data` is absent. Ensure WordPress data is loaded before rendering.
- `useGet` reports `isLoading: true` until the resolver finishes or cached data exists.
- Errors are surfaced as strings (`error` for lists, `error.message` for items) to simplify notice rendering.

### Summary

Let resources supply their own hooks. `useGet` and `useList` provide idiomatic access to resource stores with automatic loading/error states and zero boilerplate.
