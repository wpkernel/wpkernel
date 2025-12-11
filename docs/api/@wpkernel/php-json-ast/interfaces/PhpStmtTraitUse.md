[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpStmtTraitUse

# Interface: PhpStmtTraitUse

Represents a PHP `trait use` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### adaptations

```ts
readonly adaptations: PhpNode[];
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

***

### nodeType

```ts
readonly nodeType: "Stmt_TraitUse";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### traits

```ts
readonly traits: PhpName[];
```
