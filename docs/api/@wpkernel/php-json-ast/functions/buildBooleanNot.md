[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildBooleanNot

# Function: buildBooleanNot()

```ts
function buildBooleanNot(expr, attributes?): PhpExprBooleanNot;
```

Builds a PHP boolean NOT expression node.

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to negate.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprBooleanNot`](../interfaces/PhpExprBooleanNot.md)

A `PhpExprBooleanNot` node.
