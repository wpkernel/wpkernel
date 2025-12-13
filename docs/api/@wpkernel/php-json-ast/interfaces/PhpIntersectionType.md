[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpIntersectionType

# Interface: PhpIntersectionType

Represents a PHP intersection type (e.g., `A&B`).

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

### nodeType

```ts
readonly nodeType: "IntersectionType";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### types

```ts
readonly types: PhpType[];
```
