[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtClassConst

# Interface: PhpStmtClassConst

Represents a PHP class constant declaration statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

---

### consts

```ts
readonly consts: PhpConst[];
```

---

### flags

```ts
readonly flags: number;
```

---

### nodeType

```ts
readonly nodeType: "Stmt_ClassConst";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### type

```ts
readonly type: PhpType | null;
```
