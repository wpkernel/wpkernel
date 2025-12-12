[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / createMetaFragment

# Function: createMetaFragment()

```ts
function createMetaFragment(): IrFragment;
```

Creates an IR fragment that processes and assigns metadata to the IR.

This fragment sanitizes the project namespace, determines source paths and origins,
and sets up the basic PHP configuration for the generated output.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for meta information.
