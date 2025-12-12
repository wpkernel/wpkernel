[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ReduxMiddlewareAPI

# Type Alias: ReduxMiddlewareAPI&lt;TState&gt;

```ts
type ReduxMiddlewareAPI&lt;TState&gt; = object;
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

***

### getState()

```ts
getState: () =&gt; TState;
```

#### Returns

`TState`
