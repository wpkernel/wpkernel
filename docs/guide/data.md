# WordPress Data Integration

The kernel now ships first-class helpers for wiring actions into `@wordpress/data`. The goal is to make registries aware of
actions, errors, and notices without duplicating glue code in every plugin.

## `useKernel(registry, options)`

Registers kernel middleware and plugins against an existing data registry. It returns a cleanup function you can call when
tearing down tests or hot reloading modules.

```typescript
import { createRegistry } from '@wordpress/data';
import { useKernel } from '@geekist/wp-kernel-ui';
import { createReporter } from '@geekist/wp-kernel/reporter';

const registry = createRegistry();
const teardown = useKernel(registry, {
	namespace: 'showcase',
	reporter: createReporter({ namespace: 'showcase', channel: 'all' }),
});
```

### Options

| Option       | Type                | Description                                                           |
| ------------ | ------------------- | --------------------------------------------------------------------- |
| `namespace`  | `string`            | Overrides the namespace detected from globals.                        |
| `reporter`   | `Reporter`          | Custom reporter instance; defaults to a kernel-scoped reporter.       |
| `middleware` | `ReduxMiddleware[]` | Additional Redux middleware appended after the kernel action handler. |

The helper installs two kernel pieces:

1. **Action middleware** – intercepts envelopes produced by `invokeAction()` and executes defined actions.
2. **Events plugin** – listens for `wpk.action.error` events and dispatches notices via the registry while logging through the
   reporter.

Cleanup removes both middleware registrations and unsubscribes the hook listener.

## `kernelEventsPlugin`

You rarely call this directly; `useKernel()` wires it in automatically. The plugin bridges action failures to `core/notices` and
structured logging. Hook listeners receive payloads with `message`, `context`, and `timestamp` so WordPress plugins can
subscribe to `wpk.action.error` without reverse engineering the payload. The React helper now lives in `@geekist/wp-kernel-ui`.

## `registerKernelStore(key, config)`

A convenience wrapper around `createReduxStore` and `register`:

```typescript
import { registerKernelStore } from '@geekist/wp-kernel/data';

export const store = registerKernelStore('acme/posts', {
	reducer: postsReducer,
	actions: postsActions,
	selectors: postsSelectors,
	resolvers: postsResolvers,
});
```

It returns the store descriptor produced by `createReduxStore`, making it compatible with existing WordPress patterns. Use this
helper when defining stores within a kernel-powered plugin-the registry middleware from `useKernel()` will automatically pick up
kernel actions dispatched through the store.

## Putting it together

1. Define stores with `registerKernelStore()`.
2. Register the kernel middleware once per registry with `useKernel()` from `@geekist/wp-kernel-ui`.
3. Dispatch actions through `invokeAction()` envelopes-errors become notices and the reporter receives structured context.

The end result is parity with Redux integrations while keeping all error reporting, logging, and capability enforcement inside
the kernel.
