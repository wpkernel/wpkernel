[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildVariable

# Function: buildVariable()

```ts
function buildVariable(name, attributes?): PhpExprVariable;
```

Builds a PHP variable expression node.

## Parameters

### name

The name of the variable, either a string or a `PhpExpr` for dynamic variable names.

`string` | [`PhpExpr`](../type-aliases/PhpExpr.md)

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprVariable`](../interfaces/PhpExprVariable.md)

A `PhpExprVariable` node.
