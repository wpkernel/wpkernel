[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtClassMethod

# Interface: PhpStmtClassMethod

Represents a PHP class method declaration statement.

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

### byRef

```ts
readonly byRef: boolean;
```

***

### flags

```ts
readonly flags: number;
```

***

### name

```ts
readonly name: PhpIdentifier;
```

***

### nodeType

```ts
readonly nodeType: "Stmt_ClassMethod";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### params

```ts
readonly params: PhpParam[];
```

***

### returnType

```ts
readonly returnType: PhpType | null;
```

***

### stmts

```ts
readonly stmts: PhpStmt[] | null;
```
