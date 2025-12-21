[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtProperty

# Interface: PhpStmtProperty

Represents a PHP class property declaration statement.

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

### flags

```ts
readonly flags: number;
```

***

### hooks

```ts
readonly hooks: PhpPropertyHook[];
```

***

### nodeType

```ts
readonly nodeType: "Stmt_Property";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### props

```ts
readonly props: PhpStmtPropertyProperty[];
```

***

### type

```ts
readonly type: PhpType | null;
```
