[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprArray

# Interface: PhpExprArray

Represents a PHP array expression (e.g., `[1, 2, 3]` or `array(1, 2, 3)`).

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

### items

```ts
readonly items: PhpExprArrayItem[];
```

***

### nodeType

```ts
readonly nodeType: "Expr_Array";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
