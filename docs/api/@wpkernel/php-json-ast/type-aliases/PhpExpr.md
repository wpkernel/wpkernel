[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpExpr

# Type Alias: PhpExpr

```ts
type PhpExpr = 
  | PhpExprAssign
  | PhpExprArray
  | PhpExprArrayItem
  | PhpExprArrayDimFetch
  | PhpExprVariable
  | PhpExprMethodCall
  | PhpExprNullsafeMethodCall
  | PhpExprStaticCall
  | PhpExprFuncCall
  | PhpExprNew
  | PhpExprConstFetch
  | PhpExprBooleanNot
  | PhpExprInstanceof
  | PhpExprBinaryOp
  | PhpExprTernary
  | PhpExprNullsafePropertyFetch
  | PhpExprPropertyFetch
  | PhpExprStaticPropertyFetch
  | PhpExprCoalesce
  | PhpExprUnaryMinus
  | PhpExprUnaryPlus
  | PhpExprClone
  | PhpExprCastArray
  | PhpExprCastScalar
  | PhpExprMatch
  | PhpExprArrowFunction
  | PhpExprThrow
  | PhpExprClosure
  | PhpScalar
  | PhpExprBase;
```

Represents any PHP expression node.
