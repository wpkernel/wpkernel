[**@wpkernel/test-utils v0.12.5-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / withActionRuntimeOverrides

# Function: withActionRuntimeOverrides()

```ts
function withActionRuntimeOverrides<T>(overrides, callback): Promise<T>;
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

() => `T` \| `Promise`<`T`>

The function to execute with the modified runtime.

## Returns

`Promise`<`T`>

The return value of the callback.
