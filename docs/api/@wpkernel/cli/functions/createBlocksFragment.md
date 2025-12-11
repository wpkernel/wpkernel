[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / createBlocksFragment

# Function: createBlocksFragment()

```ts
function createBlocksFragment(): IrFragment;
```

Creates an IR fragment that discovers and processes WordPress blocks.

This fragment depends on the meta fragment to determine the workspace root
and then uses `block-discovery` to find and include block definitions in the IR.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for block discovery.
