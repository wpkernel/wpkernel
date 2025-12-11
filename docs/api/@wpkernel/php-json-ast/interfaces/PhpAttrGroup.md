[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpAttrGroup

# Interface: PhpAttrGroup

Represents a group of PHP attributes (e.g., `#[Attr1, Attr2]`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

***

### attrs

```ts
readonly attrs: PhpAttribute[];
```

***

### nodeType

```ts
readonly nodeType: "AttributeGroup";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
