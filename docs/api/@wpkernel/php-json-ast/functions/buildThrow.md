[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildThrow

# Function: buildThrow()

```ts
function buildThrow(expr, attributes?): PhpExprThrow;
```

Builds a PHP `throw` expression node.

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression representing the throwable object.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprThrow`](../interfaces/PhpExprThrow.md)

A `PhpExprThrow` node.
