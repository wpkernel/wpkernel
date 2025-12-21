[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildScalarBool

# Function: buildScalarBool()

```ts
function buildScalarBool(value, attributes?): PhpExprConstFetch;
```

Builds a PHP boolean scalar expression (represented as a `ConstFetch` of `true` or `false`).

## Parameters

### value

`boolean`

The boolean value.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprConstFetch`](../interfaces/PhpExprConstFetch.md)

A `PhpExprConstFetch` node representing the boolean scalar.
