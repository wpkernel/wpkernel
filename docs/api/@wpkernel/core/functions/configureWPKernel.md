[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / configureWPKernel

# Function: configureWPKernel()

```ts
function configureWPKernel(options): WPKInstance;
```

Configure and bootstrap the WPKernel runtime for the current namespace.

The helper wires middleware, reporters, the shared event bus, and optional UI
bindings. It returns a `WPKInstance` that exposes integration hooks for
invalidation, telemetry, and teardown.

## Parameters

### options

[`ConfigureWPKernelOptions`](../interfaces/ConfigureWPKernelOptions.md) = `{}`

Runtime configuration including registry, middleware, and UI hooks

## Returns

[`WPKInstance`](../interfaces/WPKInstance.md)

Configured WPKernel instance with lifecycle helpers

## Example

```ts
import { configureWPKernel } from '@wpkernel/core/data';
import { registerWPKernelStore } from '@wpkernel/core/data';

const wpk = configureWPKernel({
  namespace: 'acme',
  registry: registerWPKernelStore('acme/store', storeConfig),
});

wpk.invalidate(['post', 'list']);
wpk.emit('acme.post.published', { id: 101 });
```
