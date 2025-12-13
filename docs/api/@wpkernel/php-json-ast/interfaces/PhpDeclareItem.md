[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpDeclareItem

# Interface: PhpDeclareItem

Represents a PHP declare item (e.g., `encoding='UTF-8'` in `declare(encoding='UTF-8');`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

---

### key

```ts
readonly key: PhpIdentifier;
```

---

### nodeType

```ts
readonly nodeType: "DeclareItem";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### value

```ts
readonly value: PhpExpr;
```
