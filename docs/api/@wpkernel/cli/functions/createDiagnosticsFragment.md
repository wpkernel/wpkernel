[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / createDiagnosticsFragment

# Function: createDiagnosticsFragment()

```ts
function createDiagnosticsFragment(): IrFragment;
```

Creates an IR fragment that collects and aggregates diagnostics (warnings) from other fragments.

This fragment depends on the resources and capability-map fragments to gather
any warnings or issues identified during their processing and consolidates them
into a single list of diagnostics in the IR.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for diagnostics collection.
