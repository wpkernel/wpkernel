[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildAttribute

# Function: buildAttribute()

```ts
function buildAttribute(name, args, attributes?): PhpAttribute;
```

Builds a PHP attribute node.

## Parameters

### name

The name of the attribute (e.g., `PhpName` or `PhpIdentifier`).

[`PhpIdentifier`](../interfaces/PhpIdentifier.md) | [`PhpName`](../interfaces/PhpName.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[]

An array of `PhpArg` nodes representing the attribute's arguments.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpAttribute`](../interfaces/PhpAttribute.md)

A `PhpAttribute` node.
