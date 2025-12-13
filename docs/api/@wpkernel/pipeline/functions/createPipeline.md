[**@wpkernel/pipeline v0.12.6-beta.0**](../README.md)

***

[@wpkernel/pipeline](../README.md) / createPipeline

# Function: createPipeline()

```ts
function createPipeline&lt;TRunOptions, TBuildOptions, TContext, TReporter, TDraft, TArtifact, TDiagnostic, TRunResult, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper&gt;(options): Pipeline&lt;TRunOptions, TRunResult, TContext, TReporter, TBuildOptions, TArtifact, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TDiagnostic, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper&gt;;
```

## Type Parameters

### TRunOptions

`TRunOptions`

### TBuildOptions

`TBuildOptions`

### TContext

`TContext` *extends* `object`

### TReporter

`TReporter` *extends* [`PipelineReporter`](../interfaces/PipelineReporter.md) = [`PipelineReporter`](../interfaces/PipelineReporter.md)

### TDraft

`TDraft` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TDiagnostic

`TDiagnostic` *extends* [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](../interfaces/PipelineRunState.md)&lt;`TArtifact`, `TDiagnostic`&gt;

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TFragmentKind

`TFragmentKind` *extends* `string` = `"fragment"`

### TBuilderKind

`TBuilderKind` *extends* `string` = `"builder"`

### TFragmentHelper

`TFragmentHelper` *extends* [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt; = [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt;

### TBuilderHelper

`TBuilderHelper` *extends* [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt; = [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt;

## Parameters

### options

[`CreatePipelineOptions`](../interfaces/CreatePipelineOptions.md)&lt;`TRunOptions`, `TBuildOptions`, `TContext`, `TReporter`, `TDraft`, `TArtifact`, `TDiagnostic`, `TRunResult`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`&gt;

## Returns

[`Pipeline`](../interfaces/Pipeline.md)&lt;`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`&gt;
