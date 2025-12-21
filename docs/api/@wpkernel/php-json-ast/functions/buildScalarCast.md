[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildScalarCast

# Function: buildScalarCast()

```ts
function buildScalarCast(
   kind, 
   expr, 
   attributes?): PhpExprCastScalar;
```

Builds a PHP scalar cast expression node (int, float, string, bool).

## Parameters

### kind

The type to cast to ('int', 'float', 'string', or 'bool').

`"string"` | `"int"` | `"float"` | `"bool"`

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to cast.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprCastScalar`](../type-aliases/PhpExprCastScalar.md)

A `PhpExprCastScalar` node.
