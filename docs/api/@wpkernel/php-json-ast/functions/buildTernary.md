[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildTernary

# Function: buildTernary()

```ts
function buildTernary(
   cond, 
   ifExpr, 
   elseExpr, 
   attributes?): PhpExprTernary;
```

Builds a PHP ternary expression node.

## Parameters

### cond

[`PhpExpr`](../type-aliases/PhpExpr.md)

The conditional expression.

### ifExpr

The expression to evaluate if the condition is true (can be `null` for shorthand ternary).

[`PhpExpr`](../type-aliases/PhpExpr.md) | `null`

### elseExpr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to evaluate if the condition is false.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprTernary`](../interfaces/PhpExprTernary.md)

A `PhpExprTernary` node.
