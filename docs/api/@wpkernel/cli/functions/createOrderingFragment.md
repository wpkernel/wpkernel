[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / createOrderingFragment

# Function: createOrderingFragment()

```ts
function createOrderingFragment(): IrFragment;
```

Creates an IR fragment that sorts various IR collections for consistent output.

This fragment depends on schemas, resources, capabilities, and blocks fragments
to ensure that these collections are consistently ordered in the IR,
which is important for reproducible code generation.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for ordering IR collections.
