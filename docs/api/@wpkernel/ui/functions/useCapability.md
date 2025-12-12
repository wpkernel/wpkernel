[**@wpkernel/ui v0.12.5-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / useCapability

# Function: useCapability()

```ts
function useCapability<K>(): UseCapabilityResult<K>;
```

React hook that exposes the wpk capability runtime to UI components.

Components can gate controls with `can()` while reacting to the shared
capability cache for loading and error states. The hook mirrors the capability
enforcement path used during action execution, keeping UI affordances in
sync with capability checks. When no capability runtime is present we surface a
developer error so plugin authors remember to bootstrap via `defineCapability()`.

## Type Parameters

### K

`K` _extends_ `Record`<`string`, `unknown`>

## Returns

`UseCapabilityResult`<`K`>
