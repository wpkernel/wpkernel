[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtDo

# Interface: PhpStmtDo

Represents a PHP `do-while` loop statement.

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
readonly cond: PhpExpr;
```

***

### nodeType

```ts
readonly nodeType: "Stmt_Do";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### stmts

```ts
readonly stmts: PhpStmt[];
```
