[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildArrowFunction

# Function: buildArrowFunction()

```ts
function buildArrowFunction(options, attributes?): PhpExprArrowFunction;
```

Builds a PHP arrow function expression node.

## Parameters

### options

Configuration for the arrow function (static, by reference, parameters, return type, expression body, attribute groups).

#### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### byRef?

`boolean`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### static?

`boolean`

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprArrowFunction`](../interfaces/PhpExprArrowFunction.md)

A `PhpExprArrowFunction` node.
