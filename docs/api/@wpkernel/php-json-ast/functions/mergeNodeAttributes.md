[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / mergeNodeAttributes

# Function: mergeNodeAttributes()

```ts
function mergeNodeAttributes<T>(node, attributes?): T;
```

Merges new attributes into an existing PHP AST node's attributes.

This function creates a new node with the merged attributes if changes are detected,
otherwise, it returns the original node to ensure immutability where possible.

## Type Parameters

### T

`T` _extends_ [`PhpNode`](../interfaces/PhpNode.md)

## Parameters

### node

`T`

The original PHP AST node.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

The attributes to merge into the node.

## Returns

`T`

A new node with merged attributes, or the original node if no changes.
