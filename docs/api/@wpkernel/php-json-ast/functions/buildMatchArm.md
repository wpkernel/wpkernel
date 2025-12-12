[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildMatchArm

# Function: buildMatchArm()

```ts
function buildMatchArm(conds, body, attributes?): PhpMatchArm;
```

Builds a PHP match arm node.

## Parameters

### conds

An array of expressions representing the conditions for this arm, or `null` for the default arm.

[`PhpExpr`](../type-aliases/PhpExpr.md)[] | `null`

### body

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to execute if the conditions match.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpMatchArm`](../interfaces/PhpMatchArm.md)

A `PhpMatchArm` node.
