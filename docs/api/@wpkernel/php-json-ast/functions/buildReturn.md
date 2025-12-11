[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildReturn

# Function: buildReturn()

```ts
function buildReturn(expr, attributes?): PhpStmtReturn;
```

Builds a PHP `return` statement node.

## Parameters

### expr

The expression to return, or `null` for an empty return.

[`PhpExpr`](../type-aliases/PhpExpr.md) | `null`

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpStmtReturn`](../interfaces/PhpStmtReturn.md)

A `PhpStmtReturn` node.
