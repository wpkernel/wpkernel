[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpClosureUse

# Interface: PhpClosureUse

Represents a PHP `use` statement in a closure (e.g., `function () use ($var)`).

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

### byRef

```ts
readonly byRef: boolean;
```

***

### nodeType

```ts
readonly nodeType: "ClosureUse" | "Expr_ClosureUse";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

***

### var

```ts
readonly var: PhpExprVariable;
```
