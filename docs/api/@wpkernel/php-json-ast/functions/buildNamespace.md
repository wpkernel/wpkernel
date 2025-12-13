[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildNamespace

# Function: buildNamespace()

```ts
function buildNamespace(name, stmts, attributes?): PhpStmtNamespace;
```

Builds a PHP namespace statement node.

## Parameters

### name

The name of the namespace, or `null` for the global namespace.

[`PhpName`](../interfaces/PhpName.md) | `null`

### stmts

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

An array of `PhpStmt` nodes within the namespace.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpStmtNamespace`](../interfaces/PhpStmtNamespace.md)

A `PhpStmtNamespace` node.
