[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtUseUse

# Interface: PhpStmtUseUse

Represents an item within a PHP `use` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### alias

```ts
readonly alias: PhpIdentifier | null;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

***

### name

```ts
readonly name: PhpName;
```

***

### nodeType

```ts
readonly nodeType: "UseItem";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### type

```ts
readonly type: number;
```
