[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpNodeLike

# Type Alias: PhpNodeLike

```ts
type PhpNodeLike = 
  | PhpStmt
  | PhpExpr
  | PhpScalar
  | PhpType
  | PhpAttribute
  | PhpAttrGroup
  | PhpParam
  | PhpArg
  | PhpConst
  | PhpClosureUse
  | PhpMatchArm
  | PhpPropertyHook;
```

Represents any PHP AST node that can be part of the syntax tree.
