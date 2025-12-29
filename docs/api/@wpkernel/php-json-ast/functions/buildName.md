[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildName

# Function: buildName()

```ts
function buildName(parts, attributes?): PhpName;
```

Builds a PHP name node.

## Parameters

### parts

`string`[]

An array of strings representing the parts of the name (e.g., ['MyNamespace', 'MyClass']).

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpName`](../interfaces/PhpName.md)

A `PhpName` node.
