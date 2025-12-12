[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpScalarBase

# Interface: PhpScalarBase

Base interface for all PHP scalar nodes.

## Extends

- [`PhpNode`](PhpNode.md)

## Extended by

- [`PhpScalarString`](PhpScalarString.md)
- [`PhpScalarLNumber`](PhpScalarLNumber.md)
- [`PhpScalarDNumber`](PhpScalarDNumber.md)
- [`PhpScalarMagicConst`](PhpScalarMagicConst.md)

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
readonly nodeType: `Scalar_${string}`;
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
