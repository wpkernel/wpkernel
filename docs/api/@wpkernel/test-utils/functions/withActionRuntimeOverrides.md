[**@wpkernel/test-utils v0.12.3-beta.1**](../README.md)

***

[@wpkernel/test-utils](../README.md) / withActionRuntimeOverrides

# Function: withActionRuntimeOverrides()

```ts
function withActionRuntimeOverrides&lt;T&gt;(overrides, callback): Promise&lt;T&gt;;
```

Executes a callback with temporary action runtime overrides, ensuring cleanup afterwards.

## Type Parameters

### T

`T`

## Parameters

### overrides

[`ActionRuntimeOverrides`](../interfaces/ActionRuntimeOverrides.md)

The overrides to apply to the action runtime.

### callback

() =&gt; `T` \| `Promise`&lt;`T`&gt;

The function to execute with the modified runtime.

## Returns

`Promise`&lt;`T`&gt;

The return value of the callback.
