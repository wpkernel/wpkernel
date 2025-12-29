[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineDiagnostic

# Type Alias: PipelineDiagnostic<TKind>

```ts
type PipelineDiagnostic<TKind> =
	| ConflictDiagnostic<TKind>
	| MissingDependencyDiagnostic<TKind>
	| UnusedHelperDiagnostic<TKind>;
```

Union of all diagnostic types.

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](HelperKind.md) = [`HelperKind`](HelperKind.md)
