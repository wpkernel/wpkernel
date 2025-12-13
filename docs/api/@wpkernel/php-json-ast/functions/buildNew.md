[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildNew

# Function: buildNew()

```ts
function buildNew(className, args, attributes?): PhpExprNew;
```

Builds a PHP `new` expression node.

## Parameters

### className

The name of the class to instantiate, either a `PhpName` or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

An array of `PhpArg` nodes representing the constructor arguments.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpExprNew`](../interfaces/PhpExprNew.md)

A `PhpExprNew` node.
