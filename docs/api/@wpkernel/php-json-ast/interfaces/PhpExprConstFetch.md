[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprConstFetch

# Interface: PhpExprConstFetch

Represents a PHP constant fetch expression (e.g., `MY_CONST`).

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

### name

```ts
readonly name: PhpName;
```

---

### nodeType

```ts
readonly nodeType: "Expr_ConstFetch";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
