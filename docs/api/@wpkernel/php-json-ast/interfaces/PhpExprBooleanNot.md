[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprBooleanNot

# Interface: PhpExprBooleanNot

Represents a PHP boolean NOT expression (e.g., `!$foo`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

***

### expr

```ts
readonly expr: PhpExpr;
```

***

### nodeType

```ts
readonly nodeType: "Expr_BooleanNot";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
