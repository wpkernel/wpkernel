[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildClassMethod

# Function: buildClassMethod()

```ts
function buildClassMethod(name, options, attributes?): PhpStmtClassMethod;
```

Builds a PHP class method declaration statement node.

## Parameters

### name

[`PhpIdentifier`](../interfaces/PhpIdentifier.md)

The name of the method.

### options

Optional configuration for the method (by reference, flags, parameters, return type, statements, attribute groups).

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### byRef?

`boolean`

#### flags?

`number`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[] \| `null`

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpStmtClassMethod`](../interfaces/PhpStmtClassMethod.md)

A `PhpStmtClassMethod` node.
