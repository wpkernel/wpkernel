[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineRunState

# Interface: PipelineRunState&lt;TArtifact, TDiagnostic&gt;

State returned from a pipeline run.

## Type Parameters

### TArtifact

`TArtifact`

### TDiagnostic

`TDiagnostic` *extends* [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

## Properties

### artifact

```ts
readonly artifact: TArtifact;
```

***

### diagnostics

```ts
readonly diagnostics: readonly TDiagnostic[];
```

***

### steps

```ts
readonly steps: readonly PipelineStep&lt;HelperKind&gt;[];
```
