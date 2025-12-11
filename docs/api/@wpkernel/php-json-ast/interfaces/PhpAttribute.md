[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpAttribute

# Interface: PhpAttribute

Represents a single PHP attribute (e.g., `#[MyAttribute(arg: value)]`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### args

```ts
readonly args: PhpArg[];
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

***

### name

```ts
readonly name: PhpIdentifier | PhpName;
```

***

### nodeType

```ts
readonly nodeType: "Attribute";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
