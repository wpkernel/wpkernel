[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtFor

# Interface: PhpStmtFor

Represents a PHP `for` loop statement.

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
readonly cond: PhpExpr[];
```

***

### init

```ts
readonly init: PhpExpr[];
```

***

### loop

```ts
readonly loop: PhpExpr[];
```

***

### nodeType

```ts
readonly nodeType: "Stmt_For";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### stmts

```ts
readonly stmts: PhpStmt[];
```
