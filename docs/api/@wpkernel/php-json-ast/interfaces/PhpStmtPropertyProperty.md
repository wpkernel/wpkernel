[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtPropertyProperty

# Interface: PhpStmtPropertyProperty

Represents a single property within a PHP class property declaration.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

---

### default

```ts
readonly default: PhpExpr | null;
```

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### nodeType

```ts
readonly nodeType: "PropertyItem";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)
