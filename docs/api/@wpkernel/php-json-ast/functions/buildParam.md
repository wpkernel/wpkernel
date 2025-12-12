[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildParam

# Function: buildParam()

```ts
function buildParam(
   variable, 
   options, 
   attributes?): PhpParam;
```

Builds a PHP parameter node.

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

The variable expression for the parameter.

### options

Optional configuration for the parameter (type, by reference, variadic, default value, flags, attribute groups, hooks).

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### byRef?

`boolean`

#### default?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### flags?

`number`

#### hooks?

[`PhpPropertyHook`](../interfaces/PhpPropertyHook.md)[]

#### type?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### variadic?

`boolean`

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpParam`](../interfaces/PhpParam.md)

A `PhpParam` node.
