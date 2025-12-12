[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildUseUse

# Function: buildUseUse()

```ts
function buildUseUse(name, alias, options): PhpStmtUseUse;
```

Builds a PHP `use` item node.

## Parameters

### name

[`PhpName`](../interfaces/PhpName.md)

The name of the item being used.

### alias

An optional alias for the item.

[`PhpIdentifier`](../interfaces/PhpIdentifier.md) | `null`

### options

Optional configuration for the use item (type, attributes).

#### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

#### type?

`number`

## Returns

[`PhpStmtUseUse`](../interfaces/PhpStmtUseUse.md)

A `PhpStmtUseUse` node.
