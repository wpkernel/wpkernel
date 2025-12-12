[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildMatch

# Function: buildMatch()

```ts
function buildMatch(
   cond, 
   arms, 
   attributes?): PhpExprMatch;
```

Builds a PHP `match` expression node.

## Parameters

### cond

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to match against.

### arms

[`PhpMatchArm`](../interfaces/PhpMatchArm.md)[]

An array of `PhpMatchArm` nodes.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprMatch`](../interfaces/PhpExprMatch.md)

A `PhpExprMatch` node.
