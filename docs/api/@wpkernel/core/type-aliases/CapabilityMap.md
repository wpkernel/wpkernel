[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityMap

# Type Alias: CapabilityMap<Keys>

```ts
type CapabilityMap<Keys> = { [K in keyof Keys]: CapabilityRule<Keys[K]> };
```

Mapping from capability key to rule implementation.

## Type Parameters

### Keys

`Keys` _extends_ `Record`<`string`, `unknown`>
