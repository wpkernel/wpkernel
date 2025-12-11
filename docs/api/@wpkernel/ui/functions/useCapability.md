[**@wpkernel/ui v0.12.3-beta.2**](../README.md)

***

[@wpkernel/ui](../README.md) / useCapability

# Function: useCapability()

```ts
function useCapability&lt;K&gt;(): UseCapabilityResult&lt;K&gt;;
```

React hook that exposes the wpk capability runtime to UI components.

Components can gate controls with `can()` while reacting to the shared
capability cache for loading and error states. The hook mirrors the capability
enforcement path used during action execution, keeping UI affordances in
sync with capability checks. When no capability runtime is present we surface a
developer error so plugin authors remember to bootstrap via `defineCapability()`.

## Type Parameters

### K

`K` *extends* `Record`&lt;`string`, `unknown`&gt;

## Returns

`UseCapabilityResult`&lt;`K`&gt;
