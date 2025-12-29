[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

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

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpNullableType`](../interfaces/PhpNullableType.md)

A `PhpNullableType` node.
