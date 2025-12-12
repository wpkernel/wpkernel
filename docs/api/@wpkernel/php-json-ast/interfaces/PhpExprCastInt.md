[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprCastInt

# Interface: PhpExprCastInt

Represents a PHP integer cast expression (e.g., `(int) $var`).

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
readonly nodeType: "Expr_Cast_Int";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
