[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildClosureUse

# Function: buildClosureUse()

```ts
function buildClosureUse(variable, options, attributes?): PhpClosureUse;
```

Builds a PHP closure use node.

## Parameters

### variable

[`PhpExprVariable`](../interfaces/PhpExprVariable.md)

The variable being used in the closure.

### options

Optional configuration for the use (by reference).

#### byRef?

`boolean`

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpClosureUse`](../interfaces/PhpClosureUse.md)

A `PhpClosureUse` node.
