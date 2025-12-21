[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprMatch

# Interface: PhpExprMatch

Represents a PHP `match` expression.

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### arms

```ts
readonly arms: PhpMatchArm[];
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

***

### cond

```ts
readonly cond: PhpExpr;
```

***

### nodeType

```ts
readonly nodeType: "Expr_Match";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
