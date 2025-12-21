[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildGroupUse

# Function: buildGroupUse()

```ts
function buildGroupUse(
   type, 
   prefix, 
   uses, 
   attributes?): PhpStmtGroupUse;
```

Builds a PHP group `use` statement node.

## Parameters

### type

`number`

The type of use statement (e.g., `USE_NORMAL`, `USE_FUNCTION`, `USE_CONST`).

### prefix

[`PhpName`](../interfaces/PhpName.md)

The common prefix for the grouped uses.

### uses

[`PhpStmtUseUse`](../interfaces/PhpStmtUseUse.md)[]

An array of `PhpStmtUseUse` nodes within the group.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpStmtGroupUse`](../interfaces/PhpStmtGroupUse.md)

A `PhpStmtGroupUse` node.
