[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprClosure

# Interface: PhpExprClosure

Represents a PHP closure expression (anonymous function).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

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

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

---

### byRef

```ts
readonly byRef: boolean;
```

---

### nodeType

```ts
readonly nodeType: "Expr_Closure";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

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

### static

```ts
readonly static: boolean;
```

---

### stmts

```ts
readonly stmts: PhpStmt[];
```

---

### uses

```ts
readonly uses: PhpClosureUse[];
```
