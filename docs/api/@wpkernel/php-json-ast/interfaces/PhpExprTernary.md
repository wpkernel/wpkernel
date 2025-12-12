[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprTernary

# Interface: PhpExprTernary

Represents a PHP ternary expression (e.g., `$a ? $b : $c`).

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

### cond

```ts
readonly cond: PhpExpr;
```

***

### else

```ts
readonly else: PhpExpr;
```

***

### if

```ts
readonly if: PhpExpr | null;
```

***

### nodeType

```ts
readonly nodeType: "Expr_Ternary";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
