[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildClosure

# Function: buildClosure()

```ts
function buildClosure(options, attributes?): PhpExprClosure;
```

Builds a PHP closure expression node.

## Parameters

### options

Optional configuration for the closure (static, by reference, parameters, uses, return type, statements, attribute groups).

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

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

#### uses?

[`PhpClosureUse`](../interfaces/PhpClosureUse.md)[]

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpExprClosure`](../interfaces/PhpExprClosure.md)

A `PhpExprClosure` node.
