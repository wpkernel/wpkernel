[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / buildWpTermQueryInstantiation

# Function: buildWpTermQueryInstantiation()

```ts
function buildWpTermQueryInstantiation(options): PhpStmtExpression;
```

Builds a PHP AST statement that instantiates a `WP_Term_Query`.

## Parameters

### options

[`BuildWpTermQueryInstantiationOptions`](../interfaces/BuildWpTermQueryInstantiationOptions.md)

The options for building the instantiation.

## Returns

`PhpStmtExpression`

A PHP AST expression statement.

## Example

```ts
import { buildWpTermQueryInstantiation } from '@wpkernel/wp-json-ast';

const statement = buildWpTermQueryInstantiation({
	target: '$query',
	argsVariable: '$args',
});

// $query = new WP_Term_Query($args);
```
