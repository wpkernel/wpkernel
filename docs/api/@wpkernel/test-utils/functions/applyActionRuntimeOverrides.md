[**@wpkernel/test-utils v0.12.6-beta.0**](../README.md)

***

[@wpkernel/test-utils](../README.md) / applyActionRuntimeOverrides

# Function: applyActionRuntimeOverrides()

```ts
function applyActionRuntimeOverrides(overrides): RuntimeCleanup;
```

Applies overrides to the global action runtime and returns a cleanup function.

## Parameters

### overrides

[`ActionRuntimeOverrides`](../interfaces/ActionRuntimeOverrides.md)

The overrides to apply to the action runtime.

## Returns

[`RuntimeCleanup`](../type-aliases/RuntimeCleanup.md)

A function that, when called, restores the original action runtime.
