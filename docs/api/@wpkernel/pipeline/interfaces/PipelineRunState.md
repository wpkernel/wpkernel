[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineRunState

# Interface: PipelineRunState<TArtifact, TDiagnostic>

State returned from a pipeline run.

## Type Parameters

### TArtifact

`TArtifact`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

## Properties

### artifact

```ts
readonly artifact: TArtifact;
```

---

### diagnostics

```ts
readonly diagnostics: readonly TDiagnostic[];
```

---

### steps

```ts
readonly steps: readonly PipelineStep<string>[];
```
