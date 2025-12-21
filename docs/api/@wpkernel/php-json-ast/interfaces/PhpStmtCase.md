[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtCase

# Interface: PhpStmtCase

Represents a PHP `case` statement within a `switch` block.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

***

### cond

```ts
readonly cond: PhpExpr | null;
```

***

### nodeType

```ts
readonly nodeType: "Stmt_Case";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### stmts

```ts
readonly stmts: PhpStmt[];
```
