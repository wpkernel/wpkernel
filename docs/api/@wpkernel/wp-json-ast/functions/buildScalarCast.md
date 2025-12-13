[**@wpkernel/wp-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / buildScalarCast

# Function: buildScalarCast()

```ts
function buildScalarCast(kind, expr): PhpExpr;
```

Builds a PHP AST scalar cast expression.

## Parameters

### kind

[`ScalarCastKind`](../type-aliases/ScalarCastKind.md)

The kind of cast to perform.

### expr

`PhpExpr`

The expression to cast.

## Returns

`PhpExpr`

A PHP AST cast expression.

## Example

```ts
import { buildScalarCast, buildScalarString } from '@wpkernel/wp-json-ast';

const castExpr = buildScalarCast('int', buildScalarString('123'));
// (int) '123'
```
