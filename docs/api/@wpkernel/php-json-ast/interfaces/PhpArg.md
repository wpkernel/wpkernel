[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpArg

# Interface: PhpArg

Represents a PHP argument node.

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

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

### name

```ts
readonly name: PhpIdentifier | null;
```

---

### nodeType

```ts
readonly nodeType: "Arg";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### unpack

```ts
readonly unpack: boolean;
```

---

### value

```ts
readonly value: PhpExpr;
```
