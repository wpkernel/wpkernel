[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / wpkEventsPlugin

# Function: wpkEventsPlugin()

```ts
function wpkEventsPlugin(options): WPKernelReduxMiddleware;
```

Bridge WPKernel lifecycle events into WordPress middleware and notices.

The plugin mirrors action lifecycle and cache invalidation events onto
`wp.hooks` while optionally surfacing admin notices via the core notices
store. It returns a Redux middleware compatible with `@wordpress/data`.

## Parameters

### options

[`WPKernelEventsPluginOptions`](../type-aliases/WPKernelEventsPluginOptions.md)

Kernel event wiring options

## Returns

[`WPKernelReduxMiddleware`](../type-aliases/WPKernelReduxMiddleware.md)

Redux middleware with a `destroy()` teardown helper
