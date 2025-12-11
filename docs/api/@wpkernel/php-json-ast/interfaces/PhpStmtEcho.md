[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtEcho

# Interface: PhpStmtEcho

Represents a PHP `echo` statement.

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

### exprs

```ts
readonly exprs: PhpExpr[];
```

***

### nodeType

```ts
readonly nodeType: "Stmt_Echo";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)
