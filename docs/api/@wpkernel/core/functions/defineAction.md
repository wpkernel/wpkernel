[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / defineAction

# Function: defineAction()

```ts
function defineAction<TArgs, TResult>(config): DefinedAction<TArgs, TResult>;
```

Define a WPKernel action with lifecycle instrumentation and side-effect coordination.

Actions are the conductors of your WordPress application-they orchestrate every write
operation with consistent, predictable side effects. This is the foundation of the
**Actions-First Philosophy**: UI components never call resource write methods directly;
they always route through actions.

## What Actions Do

Every action execution automatically handles:

- **Resource calls** - Perform the actual write operation via REST API
- **Event emission** - Broadcast lifecycle events via `@wordpress/hooks` and BroadcastChannel
- **Cache invalidation** - Keep UI fresh without manual work
- **Job scheduling** - Queue background tasks without blocking users
- **Capability enforcement** - Check capabilities before writes
- **Error normalization** - Convert any error into structured `WPKernelError`
- **Observability** - Emit start/complete/error events for monitoring

## Basic Usage

```typescript
import { defineAction } from '@wpkernel/core/actions';
import { testimonial } from '@/resources/testimonial';

export const CreateTestimonial = defineAction<
	{ data: Testimonial },
	Testimonial
>('Testimonial.Create', async (ctx, { data }) => {
	// 1. Capability check
	ctx.capability.assert('testimonials.create');

	// 2. Resource call (the actual write)
	const created = await testimonial.create!(data);

	// 3. Emit canonical event
	ctx.emit(testimonial.events.created, { id: created.id, data: created });

	// 4. Invalidate cache
	ctx.invalidate(['testimonial', 'list']);

	// 5. Queue background job
	await ctx.jobs.enqueue('IndexTestimonial', { id: created.id });

	return created;
});

// Use in UI
await CreateTestimonial({ data: { title: 'Great!', rating: 5 } });
```

## Lifecycle Events

Each invocation automatically emits three lifecycle hooks via `@wordpress/hooks`:

- **`wpk.action.start`** - Before execution, includes args and metadata
- **`wpk.action.complete`** - After success, includes result and duration
- **`wpk.action.error`** - On failure, includes normalized `WPKernelError` and duration

These events enable:

- Debugging (see exactly what actions ran and when)
- Analytics (track action performance)
- Cross-component coordination (react to writes elsewhere)
- Audit trails (who did what, when)

## Event Scope

By default, actions are **cross-tab** - events broadcast to all open tabs via BroadcastChannel:

```typescript
// Default: events visible in all tabs
defineAction('Post.Create', async (ctx, args) => { ... });

// Explicit cross-tab
defineAction('Post.Create', async (ctx, args) => { ... }, { scope: 'crossTab' });

// Tab-local: events stay in current tab only
defineAction('UI.ToggleSidebar', async (ctx, args) => { ... }, { scope: 'tabLocal' });
```

**Important**: Tab-local actions (`scope: 'tabLocal'`) **never bridge to PHP** even
if `bridged: true` is provided. This ensures UI-only actions don't leak to the server.

## PHP Bridge

Set `bridged: true` (default for cross-tab) to forward events to PHP via REST:

```typescript
// Events bridge to PHP (default)
defineAction('Post.Publish', async (ctx, args) => { ... });

// Disable PHP bridge
defineAction('Post.Draft', async (ctx, args) => { ... }, { bridged: false });
```

## Context Surface

The `ActionContext` (first parameter `ctx`) provides:

- **`ctx.requestId`** - Unique correlation ID for this invocation
- **`ctx.namespace`** - Auto-detected namespace for event naming
- **`ctx.emit(eventName, payload)`** - Emit canonical events
- **`ctx.invalidate(patterns, options?)`** - Invalidate resource caches
- **`ctx.jobs.enqueue(name, payload)`** - Queue background jobs
- **`ctx.jobs.wait(name, payload, opts?)`** - Wait for job completion
- **`ctx.capability.assert(capability)`** - Throw if capability missing
- **`ctx.capability.can(capability)`** - Check capability (returns boolean)
- **`ctx.reporter.info/warn/error/debug(msg, ctx?)`** - Structured logging

## Error Handling

All errors are automatically normalized to `WPKernelError` instances with:

- Consistent error codes
- Action name and request ID in context
- Preserved stack traces
- Structured error data

```typescript
defineAction('TestAction', async (ctx, args) => {
	throw new WPKernelError('DeveloperError', { message: 'Something broke' });
});
```

## Redux Integration

Actions integrate with Redux/`@wordpress/data` stores via middleware:

```typescript
import { createActionMiddleware, invokeAction } from '@wpkernel/core/actions';

const middleware = createActionMiddleware();
const store = createReduxStore('my/store', reducers, [middleware]);

// Dispatch returns the action promise
await store.dispatch(invokeAction(CreateTestimonial, { data }));
```

## Runtime Configuration

Host applications can customize behavior via `global.__WP_KERNEL_ACTION_RUNTIME__`:

```typescript
global.__WP_KERNEL_ACTION_RUNTIME__ = {
	reporter: customLogger,
	jobs: customJobRunner,
	capability: customCapabilityEngine,
	bridge: customPHPBridge,
};
```

Without configuration, actions fall back to console logging and throw
`NotImplementedError` when job helpers are invoked.

## Type Parameters

### TArgs

`TArgs` = `void`

Type of arguments passed to the action

### TResult

`TResult` = `void`

Type of value returned by the action

## Parameters

### config

[`ActionConfig`](../type-aliases/ActionConfig.md)<`TArgs`, `TResult`>

Configuration describing the action.

## Returns

[`DefinedAction`](../type-aliases/DefinedAction.md)<`TArgs`, `TResult`>

Callable action function with metadata attached

## Throws

DeveloperError if actionName is invalid or fn is not a function

## Examples

```ts
// Basic action
export const CreatePost = defineAction(
	'Post.Create',
	async (ctx, { title, content }) => {
		const post = await postResource.create!({ title, content });
		ctx.invalidate(['post', 'list']);
		return post;
	}
);
```

```ts
// With full orchestration
export const PublishPost = defineAction('Post.Publish', async (ctx, { id }) => {
	ctx.capability.assert('posts.publish');
	const post = await postResource.update!({ id, status: 'publish' });
	ctx.emit(postResource.events.updated, { id, data: post });
	ctx.invalidate(['post', 'list'], { storeKey: 'my-plugin/post' });
	await ctx.jobs.enqueue('SendPublishNotifications', { postId: id });
	ctx.reporter.info('Post published', { postId: id });
	return post;
});
```

```ts
// Tab-local UI action
export const ToggleSidebar = defineAction({
	name: 'UI.ToggleSidebar',
	handler: async (ctx, { isOpen }) => {
		// Events stay in this tab only
		ctx.emit('ui.sidebar.toggled', { isOpen });
		return { isOpen };
	},
	options: { scope: 'tabLocal' },
});
```

## See

- ActionContext interface for the full context API surface
- middleware module for Redux integration
