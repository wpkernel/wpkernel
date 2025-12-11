[**@wpkernel/wp-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / buildRequestParamAssignmentStatement

# Function: buildRequestParamAssignmentStatement()

```ts
function buildRequestParamAssignmentStatement(options): PhpStmtExpression;
```

Builds a PHP AST statement that assigns a request parameter to a variable.

## Parameters

### options

[`RequestParamAssignmentOptions`](../interfaces/RequestParamAssignmentOptions.md)

The options for building the statement.

## Returns

`PhpStmtExpression`

A PHP AST expression statement.

## Example

```ts
import { buildRequestParamAssignmentStatement } from '@wpkernel/wp-json-ast';

const statement = buildRequestParamAssignmentStatement({
	requestVariable: '$request',
	param: 'my_param',
	targetVariable: '$myParam',
	cast: 'int',
});

// $myParam = (int) $request-&gt;get_param('my_param');
```
