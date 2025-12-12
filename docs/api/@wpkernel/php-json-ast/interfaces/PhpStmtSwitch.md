[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtSwitch

# Interface: PhpStmtSwitch

Represents a PHP `switch` statement.

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

### cases

```ts
readonly cases: PhpStmtCase[];
```

***

### cond

```ts
readonly cond: PhpExpr;
```

***

### nodeType

```ts
readonly nodeType: "Stmt_Switch";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)
