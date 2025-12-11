[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildArrayCast

# Function: buildArrayCast()

```ts
function buildArrayCast(expr, attributes?): PhpExprCastArray;
```

Builds a PHP array cast expression node.

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to cast to an array.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprCastArray`](../interfaces/PhpExprCastArray.md)

A `PhpExprCastArray` node.
