[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildClosureUse

# Function: buildClosureUse()

```ts
function buildClosureUse(
   variable, 
   options, 
   attributes?): PhpClosureUse;
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

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpClosureUse`](../interfaces/PhpClosureUse.md)

A `PhpClosureUse` node.
