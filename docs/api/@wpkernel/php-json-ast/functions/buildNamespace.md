[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildNamespace

# Function: buildNamespace()

```ts
function buildNamespace(
   name, 
   stmts, 
   attributes?): PhpStmtNamespace;
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

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpStmtNamespace`](../interfaces/PhpStmtNamespace.md)

A `PhpStmtNamespace` node.
