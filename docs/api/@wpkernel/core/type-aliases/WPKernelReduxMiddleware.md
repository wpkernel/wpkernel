[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / WPKernelReduxMiddleware

# Type Alias: WPKernelReduxMiddleware<TState>

```ts
type WPKernelReduxMiddleware<TState> = object & ReduxMiddleware<TState>;
```

Redux middleware with an optional destroy method for cleanup.

This type extends the standard ReduxMiddleware to include a `destroy` method,
allowing for proper cleanup of event listeners or other resources when the
middleware is no longer needed.

## Type Declaration

### destroy()?

```ts
optional destroy: () => void;
```

Optional cleanup method for middleware teardown

#### Returns

`void`

## Type Parameters

### TState

`TState` = `unknown`

The Redux state type
