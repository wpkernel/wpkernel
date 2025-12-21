[**@wpkernel/pipeline v0.12.6-beta.2**](../README.md)

***

[@wpkernel/pipeline](../README.md) / makePipeline

# Function: makePipeline()

```ts
function makePipeline&lt;TRunOptions, TContext, TReporter, TUserState, TDiagnostic, TRunResult&gt;(options): AgnosticPipeline&lt;TRunOptions, TRunResult, TContext, TReporter&gt;;
```

## Type Parameters

### TRunOptions

`TRunOptions`

### TContext

`TContext` *extends* `object`

### TReporter

`TReporter` *extends* [`PipelineReporter`](../interfaces/PipelineReporter.md) = [`PipelineReporter`](../interfaces/PipelineReporter.md)

### TUserState

`TUserState` = `unknown`

### TDiagnostic

`TDiagnostic` *extends* [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](../interfaces/PipelineRunState.md)&lt;`TUserState`, `TDiagnostic`&gt;

## Parameters

### options

`AgnosticPipelineOptions`&lt;`TRunOptions`, `TContext`, `TReporter`, `TUserState`, `TDiagnostic`, `TRunResult`&gt;

## Returns

`AgnosticPipeline`&lt;`TRunOptions`, `TRunResult`, `TContext`, `TReporter`&gt;
