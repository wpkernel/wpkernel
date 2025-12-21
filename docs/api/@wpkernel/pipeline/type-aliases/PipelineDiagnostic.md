[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineDiagnostic

# Type Alias: PipelineDiagnostic&lt;TKind&gt;

```ts
type PipelineDiagnostic&lt;TKind&gt; = 
  | ConflictDiagnostic&lt;TKind&gt;
  | MissingDependencyDiagnostic&lt;TKind&gt;
| UnusedHelperDiagnostic&lt;TKind&gt;;
```

Union of all diagnostic types.

## Type Parameters

### TKind

`TKind` *extends* [`HelperKind`](HelperKind.md) = [`HelperKind`](HelperKind.md)
