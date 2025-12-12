[**@wpkernel/ui v0.12.3-beta.2**](../README.md)

---

[@wpkernel/ui](../README.md) / attachResourceHooks

# Function: attachResourceHooks()

```ts
function attachResourceHooks<T, TQuery>(
	resource,
	_runtime?
): ResourceObject<T, TQuery>;
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

`ResourceObject`<`T`, `TQuery`>

Resource definition to augment with hooks

### \_runtime?

`WPKernelUIRuntime`

Active Kernel UI runtime (unused placeholder for API symmetry)

## Returns

`ResourceObject`<`T`, `TQuery`>

The same resource object with hooks attached
