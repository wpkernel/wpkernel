[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprNullsafeMethodCall

# Interface: PhpExprNullsafeMethodCall

Represents a PHP nullsafe method call expression (e.g., `$object?-&gt;method()`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### args

```ts
readonly args: PhpArg[];
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

***

### name

```ts
readonly name: 
  | PhpExpr
  | PhpIdentifier;
```

***

### nodeType

```ts
readonly nodeType: "Expr_NullsafeMethodCall";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

***

### var

```ts
readonly var: PhpExpr;
```
