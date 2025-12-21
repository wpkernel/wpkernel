[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildArray

# Function: buildArray()

```ts
function buildArray(items, attributes?): PhpExprArray;
```

Builds a PHP array expression node.

## Parameters

### items

[`PhpExprArrayItem`](../interfaces/PhpExprArrayItem.md)[]

An array of `PhpExprArrayItem` nodes.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprArray`](../interfaces/PhpExprArray.md)

A `PhpExprArray` node.
