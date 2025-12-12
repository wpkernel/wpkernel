[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprUnaryPlus

# Interface: PhpExprUnaryPlus

Represents a PHP unary plus expression (e.g., `+$foo`).

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
readonly nodeType: "Expr_UnaryPlus";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
