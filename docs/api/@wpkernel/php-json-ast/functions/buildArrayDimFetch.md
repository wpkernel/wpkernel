[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildArrayDimFetch

# Function: buildArrayDimFetch()

```ts
function buildArrayDimFetch(
   variable, 
   dim, 
   attributes?): PhpExprArrayDimFetch;
```

Builds a PHP array dimension fetch expression node.

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

The array variable.

### dim

The dimension (key) being accessed, or `null` for appending.

[`PhpExpr`](../type-aliases/PhpExpr.md) | `null`

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprArrayDimFetch`](../interfaces/PhpExprArrayDimFetch.md)

A `PhpExprArrayDimFetch` node.
