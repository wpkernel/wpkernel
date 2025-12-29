[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprStaticPropertyFetch

# Interface: PhpExprStaticPropertyFetch

Represents a PHP static property fetch expression (e.g., `MyClass::$property`).

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

### name

```ts
readonly name:
  | PhpExpr
  | PhpIdentifier;
```

---

### nodeType

```ts
readonly nodeType: "Expr_StaticPropertyFetch";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
