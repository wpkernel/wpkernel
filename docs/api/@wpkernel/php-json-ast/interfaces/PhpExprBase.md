[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExprBase

# Interface: PhpExprBase

Base interface for all PHP expression nodes.

## Extends

- [`PhpNode`](PhpNode.md)

## Extended by

- [`PhpExprAssign`](PhpExprAssign.md)
- [`PhpExprArray`](PhpExprArray.md)
- [`PhpExprArrayItem`](PhpExprArrayItem.md)
- [`PhpExprArrayDimFetch`](PhpExprArrayDimFetch.md)
- [`PhpExprVariable`](PhpExprVariable.md)
- [`PhpExprMethodCall`](PhpExprMethodCall.md)
- [`PhpExprNullsafeMethodCall`](PhpExprNullsafeMethodCall.md)
- [`PhpExprStaticCall`](PhpExprStaticCall.md)
- [`PhpExprFuncCall`](PhpExprFuncCall.md)
- [`PhpExprNew`](PhpExprNew.md)
- [`PhpExprConstFetch`](PhpExprConstFetch.md)
- [`PhpExprBooleanNot`](PhpExprBooleanNot.md)
- [`PhpExprInstanceof`](PhpExprInstanceof.md)
- [`PhpExprBinaryOp`](PhpExprBinaryOp.md)
- [`PhpExprTernary`](PhpExprTernary.md)
- [`PhpExprNullsafePropertyFetch`](PhpExprNullsafePropertyFetch.md)
- [`PhpExprPropertyFetch`](PhpExprPropertyFetch.md)
- [`PhpExprStaticPropertyFetch`](PhpExprStaticPropertyFetch.md)
- [`PhpExprCoalesce`](PhpExprCoalesce.md)
- [`PhpExprUnaryMinus`](PhpExprUnaryMinus.md)
- [`PhpExprUnaryPlus`](PhpExprUnaryPlus.md)
- [`PhpExprClone`](PhpExprClone.md)
- [`PhpExprCastArray`](PhpExprCastArray.md)
- [`PhpExprCastInt`](PhpExprCastInt.md)
- [`PhpExprCastDouble`](PhpExprCastDouble.md)
- [`PhpExprCastString`](PhpExprCastString.md)
- [`PhpExprCastBool`](PhpExprCastBool.md)
- [`PhpExprClosure`](PhpExprClosure.md)
- [`PhpExprArrowFunction`](PhpExprArrowFunction.md)
- [`PhpExprMatch`](PhpExprMatch.md)
- [`PhpExprThrow`](PhpExprThrow.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

***

### nodeType

```ts
readonly nodeType: PhpExprNodeType;
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
