[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / ReduxMiddlewareAPI

# Type Alias: ReduxMiddlewareAPI<TState>

```ts
type ReduxMiddlewareAPI<TState> = object;
```

Redux compatible middleware API signature.

## Type Parameters

### TState

`TState` = `unknown`

## Properties

### dispatch

```ts
dispatch: ReduxDispatch;
```

---

### getState()

```ts
getState: () => TState;
```

#### Returns

`TState`
