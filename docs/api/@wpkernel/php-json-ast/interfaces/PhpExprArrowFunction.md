[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprArrowFunction

# Interface: PhpExprArrowFunction

Represents a PHP arrow function expression (e.g., `fn($x) =&gt; $x * 2`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

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

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

***

### byRef

```ts
readonly byRef: boolean;
```

***

### expr

```ts
readonly expr: PhpExpr;
```

***

### nodeType

```ts
readonly nodeType: "Expr_ArrowFunction";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

***

### params

```ts
readonly params: PhpParam[];
```

***

### returnType

```ts
readonly returnType: PhpType | null;
```

***

### static

```ts
readonly static: boolean;
```
