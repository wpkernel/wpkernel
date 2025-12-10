# Reporting & Observability

The unified reporter ensures every wpk module emits structured telemetry through LogLayer. Instead of
sprinkling `console.log` calls across the codebase, you now create reporters and route messages through transports that understand
namespaces, levels, and context metadata.

## Why reporters?

- **Single source of truth** - Actions, capabilities, and registry plugins rely on the same transport configuration.
- **Structured payloads** - Hooks receive `{ message, context, timestamp }` so downstream consumers stay typed.
- **Environment aware** - Console logging is skipped in production, while hooks remain active for instrumentation.
- **Lint enforcement** - The [`@wpkernel/no-console-in-wpk`](/eslint-rules/no-console-in-wpkernel.js) rule blocks accidental `console.*` usage in core code.

## Creating a reporter

```typescript
import { createReporter } from '@wpkernel/core/reporter';

const reporter = createReporter({ namespace: 'showcase', channel: 'all' });

reporter.info('Action started', { requestId: 'act_42' });
reporter.error('Save failed', { error });
```

- **`namespace`** controls the prefix for console output and the hook name (`showcase.reporter.error`).
- **`channel`** chooses transports. Use `'all'` to enable both console and WordPress hooks.
- **`child()`** lets you create nested reporters without redefining options.

## In actions

The action runtime automatically provisions a reporter scoped to the detected namespace. You can call `ctx.reporter.*`
inside your action implementations:

```typescript
async function CreatePost(ctx: ActionContext, input) {
	ctx.reporter.debug('Creating post', { input });
	try {
		const post = await postResource.create(input);
		ctx.reporter.info('Post created', { postId: post.id });
		return post;
	} catch (error) {
		ctx.reporter.error('Post creation failed', { error });
		throw error;
	}
}
```

When an action throws, the reporter also feeds the [`wpkEventsPlugin()`](/packages/core/src/data/plugins/events.ts) bridge so failures show up as `core/notices` alerts.

## In capabilities

`defineCapability()` now accepts `debug: true` to enable reporter output. The reporter shares the same namespace so hook listeners can
correlate events across the stack. For a comprehensive guide on WPKernel's capability system, refer to the [Capabilities Guide](../guide/capability.md).

```typescript
const capability = defineCapability(rules, {
	namespace: 'showcase',
	debug: true,
});
```

Without `debug`, the capability reporter becomes a no-op and avoids console noise.

## Registry integration

[`configureWPKernel()`](/api/@wpkernel/core/functions/configureWPKernel.md) wires wpk middleware into an `@wordpress/data` registry:

```typescript
import { configureWPKernel } from '@wpkernel/core';

const registry = createRegistry();
const wpk = configureWPKernel({
	namespace: 'showcase',
	registry,
	reporter: createReporter({ namespace: 'showcase', channel: 'all' }),
});
```

- Installs the action middleware so dispatched envelopes execute wpk actions.
- Registers the events plugin which converts `wpk.action.error` into `core/notices` alerts and logs via the reporter.
- Accepts additional middleware through the `middleware` option.

Call `kernel.teardown()` when hot reloading or tearing down tests to remove middleware and hook listeners.

## Resource telemetry

Resources now emit cache and transport logs through the same reporter tree. When you
call `resource.invalidate()` the framework records `cache.invalidate.request` and
`cache.invalidate.summary` events (along with match/miss debug entries) using a
kernel-scoped reporter child. Transport operations inherit the reporter metadata as
well, so `fetchList`, `fetch`, `create`, `update`, and `remove` generate
`transport.request`, `transport.response`, or `transport.error` messages with
correlated request IDs. Forward the reporter to your logging pipeline (Sentry,
Datadog, etc.) to correlate cache invalidations and REST requests with upstream
actions and capabilities.

## Linting: no console in kernel

`console.*` calls are forbidden in `packages/core/src` outside the reporter module. Use the reporter everywhere else. The ESLint
rule runs automatically, so commits that bypass the reporter will fail linting.

## Migration tips

- Replace `console.log('[wp-kernel]', msg)` with `reporter.info(msg)`.
- When porting legacy modules, create a scoped reporter and pass it down instead of injecting raw console objects.
- To debug locally without polluting logs, use `child()` to create granular namespaces (`kernel.debug.imports`).

By routing logs through the reporter you get consistent formatting, hook emission, and future bridge support for free.
