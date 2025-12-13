[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprInstanceof

# Interface: PhpExprInstanceof

Represents a PHP `instanceof` expression (e.g., `$object instanceof MyClass`).

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

### class

```ts
readonly class: PhpExpr | PhpName;
```

---

### expr

```ts
readonly expr: PhpExpr;
```

---

### nodeType

```ts
readonly nodeType: "Expr_Instanceof";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
