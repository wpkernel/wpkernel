[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildConst

# Function: buildConst()

```ts
function buildConst(name, value, attributes?): PhpConst;
```

Builds a PHP constant node.

## Parameters

### name

[`PhpIdentifier`](../interfaces/PhpIdentifier.md)

The identifier for the constant.

### value

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression representing the constant's value.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpConst`](../interfaces/PhpConst.md)

A `PhpConst` node.
