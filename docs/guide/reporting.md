# Reporting & Observability

Sprint 4.5 introduces a unified reporter so every kernel module emits structured telemetry through LogLayer. Instead of
sprinkling `console.log` calls across the codebase, you now create reporters and route messages through transports that understand
namespaces, levels, and context metadata.

## Why reporters?

- **Single source of truth** – Actions, policies, and registry plugins rely on the same transport configuration.
- **Structured payloads** – Hooks receive `{ message, context, timestamp }` so downstream consumers stay typed.
- **Environment aware** – Console logging is skipped in production, while hooks remain active for instrumentation.
- **Lint enforcement** – The `@kernel/no-console-in-kernel` rule blocks accidental `console.*` usage in core code.

## Creating a reporter

```typescript
import { createReporter } from '@geekist/wp-kernel/reporter';

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
async function CreatePost(ctx, input) {
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

When an action throws, the reporter also feeds the `kernelEventsPlugin()` bridge so failures show up as `core/notices` alerts.

## In policies

`definePolicy()` now accepts `debug: true` to enable reporter output. The reporter shares the same namespace so hook listeners can
correlate events across the stack:

```typescript
const policy = definePolicy(rules, {
	namespace: 'showcase',
	debug: true,
});
```

Without `debug`, the policy reporter becomes a no-op and avoids console noise.

## Registry integration

The `withKernel()` helper wires kernel middleware into an `@wordpress/data` registry:

```typescript
import { withKernel } from '@geekist/wp-kernel';

const registry = createRegistry();
const teardown = withKernel(registry, {
	namespace: 'showcase',
	reporter: createReporter({ namespace: 'showcase', channel: 'all' }),
});
```

- Installs the action middleware so dispatched envelopes execute kernel actions.
- Registers the events plugin which converts `wpk.action.error` into `core/notices` entries and logs via the reporter.
- Accepts additional middleware through the `middleware` option.

Call the returned cleanup function when hot reloading or tearing down tests to remove middleware and hook listeners.

## Linting: no console in kernel

`console.*` calls are forbidden in `packages/kernel/src` outside the reporter module. Use the reporter everywhere else. The ESLint
rule runs automatically, so commits that bypass the reporter will fail linting.

## Migration tips

- Replace `console.log('[wp-kernel]', msg)` with `reporter.info(msg)`.
- When porting legacy modules, create a scoped reporter and pass it down instead of injecting raw console objects.
- To debug locally without polluting logs, use `child()` to create granular namespaces (`kernel.debug.imports`).

By routing logs through the reporter you get consistent formatting, hook emission, and future bridge support for free.
