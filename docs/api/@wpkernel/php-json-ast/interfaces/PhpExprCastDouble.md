[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprCastDouble

# Interface: PhpExprCastDouble

Represents a PHP float cast expression (e.g., `(float) $var`).

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

### expr

```ts
readonly expr: PhpExpr;
```

---

### nodeType

```ts
readonly nodeType: "Expr_Cast_Double";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
