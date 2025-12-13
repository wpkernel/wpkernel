[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildClass

# Function: buildClass()

```ts
function buildClass(name, options, attributes?): PhpStmtClass;
```

Builds a PHP class declaration statement node.

## Parameters

### name

The name of the class, or `null` for an anonymous class.

[`PhpIdentifier`](../interfaces/PhpIdentifier.md) | `null`

### options

Optional configuration for the class (flags, extends, implements, statements, attribute groups, namespaced name).

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### extends?

[`PhpName`](../interfaces/PhpName.md) \| `null`

#### flags?

`number`

#### implements?

[`PhpName`](../interfaces/PhpName.md)[]

#### namespacedName?

[`PhpName`](../interfaces/PhpName.md) \| `null`

#### stmts?

[`PhpClassStmt`](../type-aliases/PhpClassStmt.md)[]

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpStmtClass`](../interfaces/PhpStmtClass.md)

A `PhpStmtClass` node.
