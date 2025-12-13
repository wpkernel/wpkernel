[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildDeclare

# Function: buildDeclare()

```ts
function buildDeclare(declares, options, attributes?): PhpStmtDeclare;
```

Builds a PHP `declare` statement node.

## Parameters

### declares

[`PhpDeclareItem`](../interfaces/PhpDeclareItem.md)[]

An array of `PhpDeclareItem` nodes.

### options

Optional configuration for the declare statement (statements).

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[] \| `null`

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpStmtDeclare`](../interfaces/PhpStmtDeclare.md)

A `PhpStmtDeclare` node.
