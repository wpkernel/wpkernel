[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpMatchArm

# Interface: PhpMatchArm

Represents a single arm in a PHP `match` expression.

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

### body

```ts
readonly body: PhpExpr;
```

***

### conds

```ts
readonly conds: PhpExpr[] | null;
```

***

### nodeType

```ts
readonly nodeType: "MatchArm";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
