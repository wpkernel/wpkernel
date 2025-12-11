[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprCoalesce

# Interface: PhpExprCoalesce

Represents a PHP null coalescing operator expression (e.g., `$a ?? $b`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

---

### left

```ts
readonly left: PhpExpr;
```

---

### nodeType

```ts
readonly nodeType: "Expr_BinaryOp_Coalesce";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### right

```ts
readonly right: PhpExpr;
```
