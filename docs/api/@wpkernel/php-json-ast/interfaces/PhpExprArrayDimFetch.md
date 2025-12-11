[**@wpkernel/php-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprArrayDimFetch

# Interface: PhpExprArrayDimFetch

Represents a PHP array dimension fetch expression (e.g., `$array[key]`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

***

### dim

```ts
readonly dim: PhpExpr | null;
```

***

### nodeType

```ts
readonly nodeType: "Expr_ArrayDimFetch";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

***

### var

```ts
readonly var: PhpExpr;
```
