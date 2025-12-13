[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ReduxMiddleware

# Type Alias: ReduxMiddleware<TState>

```ts
type ReduxMiddleware<TState> = (api) => (next) => (action) => unknown;
```

Redux compatible middleware type without depending on redux package.

## Type Parameters

### TState

`TState` = `unknown`

## Parameters

### api

[`ReduxMiddlewareAPI`](ReduxMiddlewareAPI.md)<`TState`>

## Returns

```ts
(next): (action) => unknown;
```

### Parameters

#### next

[`ReduxDispatch`](ReduxDispatch.md)

### Returns

```ts
(action): unknown;
```

#### Parameters

##### action

`unknown`

#### Returns

`unknown`
