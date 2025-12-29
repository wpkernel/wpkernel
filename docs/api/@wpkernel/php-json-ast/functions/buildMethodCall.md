[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildMethodCall

# Function: buildMethodCall()

```ts
function buildMethodCall(variable, name, args, attributes?): PhpExprMethodCall;
```

Builds a PHP method call expression node.

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

The variable or expression representing the object.

### name

The name of the method, either an identifier or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

An array of `PhpArg` nodes representing the method arguments.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpExprMethodCall`](../interfaces/PhpExprMethodCall.md)

A `PhpExprMethodCall` node.
