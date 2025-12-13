[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildFullyQualifiedName

# Function: buildFullyQualifiedName()

```ts
function buildFullyQualifiedName(parts, attributes?): PhpName;
```

Builds a fully qualified PHP name node.

## Parameters

### parts

`string`[]

An array of strings representing the parts of the fully qualified name.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpName`](../interfaces/PhpName.md)

A `PhpName` node with `nodeType` set to 'Name_FullyQualified'.
