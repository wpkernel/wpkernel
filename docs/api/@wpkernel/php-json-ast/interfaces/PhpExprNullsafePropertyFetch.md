[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprNullsafePropertyFetch

# Interface: PhpExprNullsafePropertyFetch

Represents a PHP nullsafe property fetch expression (e.g., `$object?-&gt;property`).

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

### name

```ts
readonly name: 
  | PhpExpr
  | PhpIdentifier;
```

***

### nodeType

```ts
readonly nodeType: "Expr_NullsafePropertyFetch";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

***

### var

```ts
readonly var: PhpExpr;
```
