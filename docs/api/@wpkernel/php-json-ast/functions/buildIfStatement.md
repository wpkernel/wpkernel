[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildIfStatement

# Function: buildIfStatement()

```ts
function buildIfStatement(cond, stmts, options, attributes?): PhpStmtIf;
```

Builds a PHP `if` statement node.

## Parameters

### cond

[`PhpExpr`](../type-aliases/PhpExpr.md)

The conditional expression.

### stmts

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

An array of `PhpStmt` nodes for the `if` block.

### options

Optional configuration for `elseif` and `else` branches.

#### elseBranch?

[`PhpStmtElse`](../interfaces/PhpStmtElse.md) \| `null`

#### elseifs?

[`PhpStmtElseIf`](../interfaces/PhpStmtElseIf.md)[]

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpStmtIf`](../interfaces/PhpStmtIf.md)

A `PhpStmtIf` node.
