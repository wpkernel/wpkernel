[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildUse

# Function: buildUse()

```ts
function buildUse(type, uses, attributes?): PhpStmtUse;
```

Builds a PHP `use` statement node.

## Parameters

### type

`number`

The type of use statement (e.g., `USE_NORMAL`, `USE_FUNCTION`, `USE_CONST`).

### uses

[`PhpStmtUseUse`](../interfaces/PhpStmtUseUse.md)[]

An array of `PhpStmtUseUse` nodes representing the used items.

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpStmtUse`](../interfaces/PhpStmtUse.md)

A `PhpStmtUse` node.
