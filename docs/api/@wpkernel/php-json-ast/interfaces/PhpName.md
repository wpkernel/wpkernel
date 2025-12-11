[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpName

# Interface: PhpName

Represents a PHP name node (e.g., namespace, class name).

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

### nodeType

```ts
readonly nodeType: "Name" | "Name_FullyQualified" | "Name_Relative";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

***

### parts

```ts
readonly parts: string[];
```
