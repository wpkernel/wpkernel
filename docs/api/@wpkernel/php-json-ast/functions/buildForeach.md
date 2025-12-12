[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildForeach

# Function: buildForeach()

```ts
function buildForeach(expr, options, attributes?): PhpStmtForeach;
```

Builds a PHP `foreach` loop statement node.

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to iterate over.

### options

Configuration for the `foreach` loop (value variable, optional key variable, by reference, statements).

#### valueVar

[`PhpExpr`](../type-aliases/PhpExpr.md)

#### byRef?

`boolean`

#### keyVar?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpStmtForeach`](../interfaces/PhpStmtForeach.md)

A `PhpStmtForeach` node.
