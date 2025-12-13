[**@wpkernel/ui v0.12.5-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / useAction

# Function: useAction()

```ts
function useAction<TInput, TResult>(
	action,
	options
): UseActionResult<TInput, TResult>;
```

React hook for invoking a wpk action.

This hook provides a convenient way to execute a `DefinedAction` and manage its lifecycle,
including loading states, errors, and concurrency control. It integrates with the WordPress
data store for dispatching actions and can automatically invalidate resource caches upon success.

## Type Parameters

### TInput

`TInput`

The type of the input arguments for the action.

### TResult

`TResult`

The type of the result returned by the action.

## Parameters

### action

`DefinedAction`<`TInput`, `TResult`>

The `DefinedAction` to be invoked.

### options

[`UseActionOptions`](../interfaces/UseActionOptions.md)<`TInput`, `TResult`> = `{}`

Configuration options for the action invocation, including concurrency and invalidation.

## Returns

[`UseActionResult`](../interfaces/UseActionResult.md)<`TInput`, `TResult`>

An object containing the action's current state (`status`, `error`, `result`, `inFlight`) and control functions (`run`, `cancel`, `reset`).
