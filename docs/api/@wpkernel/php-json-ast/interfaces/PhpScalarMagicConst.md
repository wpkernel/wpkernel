[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpScalarMagicConst

# Interface: PhpScalarMagicConst

Represents a PHP magic constant scalar node (e.g., `__FILE__`, `__LINE__`).

## Extends

- [`PhpScalarBase`](PhpScalarBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpScalarBase`](PhpScalarBase.md).[`attributes`](PhpScalarBase.md#attributes)

***

### nodeType

```ts
readonly nodeType: `Scalar_MagicConst_${string}`;
```

#### Overrides

[`PhpScalarBase`](PhpScalarBase.md).[`nodeType`](PhpScalarBase.md#nodetype)
