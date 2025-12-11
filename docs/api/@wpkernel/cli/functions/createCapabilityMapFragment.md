[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / createCapabilityMapFragment

# Function: createCapabilityMapFragment()

```ts
function createCapabilityMapFragment(): IrFragment;
```

Creates an IR fragment that resolves and assigns the capability map to the IR.

This fragment depends on the resources and capabilities fragments to build a
comprehensive map of all capabilities used within the project.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for capability map resolution.
