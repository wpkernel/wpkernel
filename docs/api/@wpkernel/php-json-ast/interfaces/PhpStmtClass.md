[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtClass

# Interface: PhpStmtClass

Represents a PHP class declaration statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

***

### extends

```ts
readonly extends: PhpName | null;
```

***

### flags

```ts
readonly flags: number;
```

***

### implements

```ts
readonly implements: PhpName[];
```

***

### name

```ts
readonly name: PhpIdentifier | null;
```

***

### namespacedName

```ts
readonly namespacedName: PhpName | null;
```

***

### nodeType

```ts
readonly nodeType: "Stmt_Class";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### stmts

```ts
readonly stmts: PhpClassStmt[];
```
