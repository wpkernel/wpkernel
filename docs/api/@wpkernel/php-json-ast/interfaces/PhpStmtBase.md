[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtBase

# Interface: PhpStmtBase

Base interface for all PHP statement nodes.

## Extends

- [`PhpNode`](PhpNode.md)

## Extended by

- [`PhpStmtNamespace`](PhpStmtNamespace.md)
- [`PhpStmtUse`](PhpStmtUse.md)
- [`PhpStmtGroupUse`](PhpStmtGroupUse.md)
- [`PhpStmtUseUse`](PhpStmtUseUse.md)
- [`PhpStmtClass`](PhpStmtClass.md)
- [`PhpStmtTraitUse`](PhpStmtTraitUse.md)
- [`PhpStmtClassConst`](PhpStmtClassConst.md)
- [`PhpStmtProperty`](PhpStmtProperty.md)
- [`PhpStmtPropertyProperty`](PhpStmtPropertyProperty.md)
- [`PhpStmtClassMethod`](PhpStmtClassMethod.md)
- [`PhpStmtFunction`](PhpStmtFunction.md)
- [`PhpStmtExpression`](PhpStmtExpression.md)
- [`PhpStmtEcho`](PhpStmtEcho.md)
- [`PhpStmtReturn`](PhpStmtReturn.md)
- [`PhpStmtDeclare`](PhpStmtDeclare.md)
- [`PhpStmtIf`](PhpStmtIf.md)
- [`PhpStmtElseIf`](PhpStmtElseIf.md)
- [`PhpStmtElse`](PhpStmtElse.md)
- [`PhpStmtForeach`](PhpStmtForeach.md)
- [`PhpStmtFor`](PhpStmtFor.md)
- [`PhpStmtWhile`](PhpStmtWhile.md)
- [`PhpStmtDo`](PhpStmtDo.md)
- [`PhpStmtSwitch`](PhpStmtSwitch.md)
- [`PhpStmtCase`](PhpStmtCase.md)
- [`PhpStmtBreak`](PhpStmtBreak.md)
- [`PhpStmtContinue`](PhpStmtContinue.md)
- [`PhpStmtNop`](PhpStmtNop.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

---

### nodeType

```ts
readonly nodeType: `Stmt_${string}` | "UseItem" | "PropertyItem";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
