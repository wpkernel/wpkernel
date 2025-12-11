[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpPropertyHook

# Interface: PhpPropertyHook

Represents a PHP property hook (e.g., `__get`, `__set`).

## Extends

- [`PhpNode`](PhpNode.md)

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

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

***

### body

```ts
readonly body: 
  | PhpExpr
  | PhpStmt[]
  | null;
```

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
readonly nodeType: "PropertyHook";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

***

### params

```ts
readonly params: PhpParam[];
```
