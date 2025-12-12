[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildIdentifier

# Function: buildIdentifier()

```ts
function buildIdentifier(name, attributes?): PhpIdentifier;
```

Builds a PHP identifier node.

## Parameters

### name

`string`

The name of the identifier.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpIdentifier`](../interfaces/PhpIdentifier.md)

A `PhpIdentifier` node.
