[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildNullsafeMethodCall

# Function: buildNullsafeMethodCall()

```ts
function buildNullsafeMethodCall(
   variable, 
   name, 
   args, 
   attributes?): PhpExprNullsafeMethodCall;
```

Builds a PHP nullsafe method call expression node.

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

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprNullsafeMethodCall`](../interfaces/PhpExprNullsafeMethodCall.md)

A `PhpExprNullsafeMethodCall` node.
