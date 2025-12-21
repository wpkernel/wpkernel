[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildDeclare

# Function: buildDeclare()

```ts
function buildDeclare(
   declares, 
   options, 
   attributes?): PhpStmtDeclare;
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

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpStmtDeclare`](../interfaces/PhpStmtDeclare.md)

A `PhpStmtDeclare` node.
