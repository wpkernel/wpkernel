[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / createResourcesFragment

# Function: createResourcesFragment()

```ts
function createResourcesFragment(): IrFragment;
```

Creates an IR fragment that processes and builds resource definitions.

This fragment depends on the meta and schemas fragments to properly construct
the resource definitions, including their associated schemas and namespace information.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for resource processing.
