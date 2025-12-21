[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / WPKernelReduxMiddleware

# Type Alias: WPKernelReduxMiddleware&lt;TState&gt;

```ts
type WPKernelReduxMiddleware&lt;TState&gt; = object & ReduxMiddleware&lt;TState&gt;;
```

Redux middleware with an optional destroy method for cleanup.

This type extends the standard ReduxMiddleware to include a `destroy` method,
allowing for proper cleanup of event listeners or other resources when the
middleware is no longer needed.

## Type Declaration

### destroy()?

```ts
optional destroy: () =&gt; void;
```

Optional cleanup method for middleware teardown

#### Returns

`void`

## Type Parameters

### TState

`TState` = `unknown`

The Redux state type
