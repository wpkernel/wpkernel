[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprArrayItem

# Interface: PhpExprArrayItem

Represents an item within a PHP array expression.

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

### byRef

```ts
readonly byRef: boolean;
```

---

### key

```ts
readonly key: PhpExpr | null;
```

---

### nodeType

```ts
readonly nodeType: "ArrayItem";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### unpack

```ts
readonly unpack: boolean;
```

---

### value

```ts
readonly value: PhpExpr;
```
