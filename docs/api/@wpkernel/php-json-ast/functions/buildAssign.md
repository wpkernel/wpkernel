[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildAssign

# Function: buildAssign()

```ts
function buildAssign(variable, expr, attributes?): PhpExprAssign;
```

Builds a PHP assignment expression node.

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

The variable being assigned to.

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression whose value is being assigned.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpExprAssign`](../interfaces/PhpExprAssign.md)

A `PhpExprAssign` node.
