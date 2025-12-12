[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildAssign

# Function: buildAssign()

```ts
function buildAssign(
   variable, 
   expr, 
   attributes?): PhpExprAssign;
```

Builds a PHP assignment expression node.

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

The variable being assigned to.

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression whose value is being assigned.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprAssign`](../interfaces/PhpExprAssign.md)

A `PhpExprAssign` node.
