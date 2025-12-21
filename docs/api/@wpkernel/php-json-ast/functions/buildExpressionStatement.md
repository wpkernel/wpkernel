[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildExpressionStatement

# Function: buildExpressionStatement()

```ts
function buildExpressionStatement(expr, attributes?): PhpStmtExpression;
```

Builds a PHP expression statement node.

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to be used as a statement.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpStmtExpression`](../interfaces/PhpStmtExpression.md)

A `PhpStmtExpression` node.
