[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildFuncCall

# Function: buildFuncCall()

```ts
function buildFuncCall(
   name, 
   args, 
   attributes?): PhpExprFuncCall;
```

Builds a PHP function call expression node.

## Parameters

### name

The name of the function, either a `PhpName` or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

An array of `PhpArg` nodes representing the function arguments.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprFuncCall`](../interfaces/PhpExprFuncCall.md)

A `PhpExprFuncCall` node.
