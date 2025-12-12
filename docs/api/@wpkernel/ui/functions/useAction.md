[**@wpkernel/ui v0.12.5-beta.0**](../README.md)

***

[@wpkernel/ui](../README.md) / useAction

# Function: useAction()

```ts
function useAction&lt;TInput, TResult&gt;(action, options): UseActionResult&lt;TInput, TResult&gt;;
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

`DefinedAction`&lt;`TInput`, `TResult`&gt;

The `DefinedAction` to be invoked.

### options

[`UseActionOptions`](../interfaces/UseActionOptions.md)&lt;`TInput`, `TResult`&gt; = `{}`

Configuration options for the action invocation, including concurrency and invalidation.

## Returns

[`UseActionResult`](../interfaces/UseActionResult.md)&lt;`TInput`, `TResult`&gt;

An object containing the action's current state (`status`, `error`, `result`, `inFlight`) and control functions (`run`, `cancel`, `reset`).
