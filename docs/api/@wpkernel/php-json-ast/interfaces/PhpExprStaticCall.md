[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprStaticCall

# Interface: PhpExprStaticCall

Represents a PHP static method call expression (e.g., `MyClass::staticMethod()`).

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

### class

```ts
readonly class: PhpExpr | PhpName;
```

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
readonly nodeType: "Expr_StaticCall";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
