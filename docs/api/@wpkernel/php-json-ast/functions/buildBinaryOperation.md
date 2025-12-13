[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildBinaryOperation

# Function: buildBinaryOperation()

```ts
function buildBinaryOperation(
	operator,
	left,
	right,
	attributes?
): PhpExprBinaryOp;
```

Builds a PHP binary operation expression node.

## Parameters

### operator

[`PhpBinaryOperator`](../type-aliases/PhpBinaryOperator.md)

The binary operator (e.g., 'Plus', 'BooleanAnd').

### left

[`PhpExpr`](../type-aliases/PhpExpr.md)

The left-hand side expression.

### right

[`PhpExpr`](../type-aliases/PhpExpr.md)

The right-hand side expression.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpExprBinaryOp`](../interfaces/PhpExprBinaryOp.md)

A `PhpExprBinaryOp` node.
