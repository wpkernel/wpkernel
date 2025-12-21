[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpConst

# Interface: PhpConst

Represents a PHP constant definition (e.g., `const MY_CONST = 123;`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

***

### name

```ts
readonly name: PhpIdentifier;
```

***

### nodeType

```ts
readonly nodeType: "Const";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

***

### value

```ts
readonly value: PhpExpr;
```
