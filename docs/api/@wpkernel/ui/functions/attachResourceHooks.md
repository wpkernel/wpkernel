[**@wpkernel/ui v0.12.3-beta.1**](../README.md)

***

[@wpkernel/ui](../README.md) / attachResourceHooks

# Function: attachResourceHooks()

```ts
function attachResourceHooks&lt;T, TQuery&gt;(resource, _runtime?): ResourceObject&lt;T, TQuery&gt;;
```

Attach `useGet` and `useList` React helpers to a resource definition.

The hooks wrap `@wordpress/data.useSelect()` to expose resource data with
loading and error states that mirror resolver status. They are registered on
demand when the UI bundle is evaluated so resource modules remain tree-shake
friendly for non-React contexts.

## Type Parameters

### T

`T`

Entity type

### TQuery

`TQuery`

Query parameter type

## Parameters

### resource

`ResourceObject`&lt;`T`, `TQuery`&gt;

Resource definition to augment with hooks

### \_runtime?

`WPKernelUIRuntime`

Active Kernel UI runtime (unused placeholder for API symmetry)

## Returns

`ResourceObject`&lt;`T`, `TQuery`&gt;

The same resource object with hooks attached
