[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildDeclareItem

# Function: buildDeclareItem()

```ts
function buildDeclareItem(
   key, 
   value, 
   attributes?): PhpDeclareItem;
```

Builds a PHP declare item node.

## Parameters

### key

The key of the declare item, either a string or a `PhpIdentifier`.

`string` | [`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### value

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression representing the value of the declare item.

### attributes?

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt;

Optional attributes for the node.

## Returns

[`PhpDeclareItem`](../interfaces/PhpDeclareItem.md)

A `PhpDeclareItem` node.
