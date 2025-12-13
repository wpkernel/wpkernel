[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildPropertyFetch

# Function: buildPropertyFetch()

```ts
function buildPropertyFetch(
   variable, 
   name, 
   attributes?): PhpExprPropertyFetch;
```

Builds a PHP property fetch expression node.

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

The variable or expression representing the object.

### name

The name of the property, either an identifier or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprPropertyFetch`](../interfaces/PhpExprPropertyFetch.md)

A `PhpExprPropertyFetch` node.
