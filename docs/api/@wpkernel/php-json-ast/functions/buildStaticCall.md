[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildStaticCall

# Function: buildStaticCall()

```ts
function buildStaticCall(
   className, 
   name, 
   args, 
   attributes?): PhpExprStaticCall;
```

Builds a PHP static method call expression node.

## Parameters

### className

The name of the class, either a `PhpName` or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### name

The name of the static method, either an identifier or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

An array of `PhpArg` nodes representing the method arguments.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprStaticCall`](../interfaces/PhpExprStaticCall.md)

A `PhpExprStaticCall` node.
