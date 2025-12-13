[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

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

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpExprConstFetch`](../interfaces/PhpExprConstFetch.md)

A `PhpExprConstFetch` node representing the boolean scalar.
