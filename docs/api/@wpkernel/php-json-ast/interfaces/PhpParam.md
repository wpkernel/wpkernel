[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpParam

# Interface: PhpParam

Represents a PHP parameter node in a function or method signature.

## Extends

- [`PhpNode`](PhpNode.md)

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

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

---

### byRef

```ts
readonly byRef: boolean;
```

---

### default

```ts
readonly default: PhpExpr | null;
```

---

### flags

```ts
readonly flags: number;
```

---

### hooks

```ts
readonly hooks: PhpPropertyHook[];
```

---

### nodeType

```ts
readonly nodeType: "Param";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### type

```ts
readonly type: PhpType | null;
```

---

### var

```ts
readonly var: PhpExpr;
```

---

### variadic

```ts
readonly variadic: boolean;
```
