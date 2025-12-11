[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildNode

# Function: buildNode()

```ts
function buildNode<T>(
   nodeType,
   props,
   attributes?): T;
```

Generic factory helper for PHP AST node construction.

Prefer dedicated builders exported alongside the node interfaces for specific node types.
Use this generic builder for niche constructs that do not yet have a typed factory.

## Type Parameters

### T

`T` _extends_ [`PhpNode`](../interfaces/PhpNode.md)

## Parameters

### nodeType

`T`\[`"nodeType"`\]

The type of the PHP AST node.

### props

`Omit`<`T`, `"nodeType"` \| `"attributes"`>

The properties of the node, excluding `nodeType` and `attributes`.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

`T`

A new PHP AST node of the specified type.
