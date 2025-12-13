[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtFunction

# Interface: PhpStmtFunction

Represents a PHP function declaration statement.

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

### byRef

```ts
readonly byRef: boolean;
```

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### namespacedName

```ts
readonly namespacedName: PhpName | null;
```

---

### nodeType

```ts
readonly nodeType: "Stmt_Function";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### params

```ts
readonly params: PhpParam[];
```

---

### returnType

```ts
readonly returnType: PhpType | null;
```

---

### stmts

```ts
readonly stmts: PhpStmt[];
```
