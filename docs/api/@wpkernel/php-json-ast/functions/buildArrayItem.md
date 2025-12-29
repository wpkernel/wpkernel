[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildArrayItem

# Function: buildArrayItem()

```ts
function buildArrayItem(value, options, attributes?): PhpExprArrayItem;
```

Builds a PHP array item node.

## Parameters

### value

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression representing the item's value.

### options

Optional configuration for the array item (key, by reference, unpack).

#### byRef?

`boolean`

#### key?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### unpack?

`boolean`

### attributes?

`Readonly`<`Record`<`string`, `unknown`>>

Optional attributes for the node.

## Returns

[`PhpExprArrayItem`](../interfaces/PhpExprArrayItem.md)

A `PhpExprArrayItem` node.
