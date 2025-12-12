[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

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

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpExprBooleanNot`](../interfaces/PhpExprBooleanNot.md)

A `PhpExprBooleanNot` node.
