[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildNullableType

# Function: buildNullableType()

```ts
function buildNullableType(type, attributes?): PhpNullableType;
```

Builds a nullable PHP type node.

## Parameters

### type

[`PhpType`](../type-aliases/PhpType.md)

The type node to make nullable.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpNullableType`](../interfaces/PhpNullableType.md)

A `PhpNullableType` node.
