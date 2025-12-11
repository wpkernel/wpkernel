[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtContinue

# Interface: PhpStmtContinue

Represents a PHP `continue` statement.

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

### nodeType

```ts
readonly nodeType: "Stmt_Continue";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### num

```ts
readonly num: PhpExpr | null;
```
