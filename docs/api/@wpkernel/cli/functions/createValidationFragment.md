[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / createValidationFragment

# Function: createValidationFragment()

```ts
function createValidationFragment(): IrFragment;
```

Creates an IR fragment that performs final validation checks on the IR.

This fragment depends on the meta, resources, and capability-map fragments
to ensure that the IR is internally consistent and meets all framework contracts.
It throws `WPKernelError` if any critical validation fails.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for final IR validation.
