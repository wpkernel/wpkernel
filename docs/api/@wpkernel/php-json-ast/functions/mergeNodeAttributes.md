[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / mergeNodeAttributes

# Function: mergeNodeAttributes()

```ts
function mergeNodeAttributes&lt;T&gt;(node, attributes?): T;
```

Merges new attributes into an existing PHP AST node's attributes.

This function creates a new node with the merged attributes if changes are detected,
otherwise, it returns the original node to ensure immutability where possible.

## Type Parameters

### T

`T` *extends* [`PhpNode`](../interfaces/PhpNode.md)

## Parameters

### node

`T`

The original PHP AST node.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

The attributes to merge into the node.

## Returns

`T`

A new node with merged attributes, or the original node if no changes.
