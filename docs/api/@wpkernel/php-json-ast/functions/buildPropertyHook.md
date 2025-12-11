[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildPropertyHook

# Function: buildPropertyHook()

```ts
function buildPropertyHook(
   name, 
   body, 
   options, 
   attributes?): PhpPropertyHook;
```

Builds a PHP property hook node.

## Parameters

### name

[`PhpIdentifier`](../interfaces/PhpIdentifier.md)

The name of the property hook (e.g., `__get`, `__set`).

### body

The body of the property hook, either an expression or an array of statements.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpStmt`](../type-aliases/PhpStmt.md)[] | `null`

### options

Optional configuration for the property hook (attribute groups, flags, by reference, parameters).

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### byRef?

`boolean`

#### flags?

`number`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpPropertyHook`](../interfaces/PhpPropertyHook.md)

A `PhpPropertyHook` node.
