[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildArg

# Function: buildArg()

```ts
function buildArg(
   value, 
   options, 
   attributes?): PhpArg;
```

Builds a PHP argument node.

## Parameters

### value

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression representing the argument's value.

### options

Optional configuration for the argument (by reference, unpack, name).

#### byRef?

`boolean`

#### name?

[`PhpIdentifier`](../interfaces/PhpIdentifier.md) \| `null`

#### unpack?

`boolean`

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpArg`](../interfaces/PhpArg.md)

A `PhpArg` node.
