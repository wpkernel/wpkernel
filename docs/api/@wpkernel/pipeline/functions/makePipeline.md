[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / makePipeline

# Function: makePipeline()

```ts
function makePipeline<
	TRunOptions,
	TContext,
	TReporter,
	TUserState,
	TDiagnostic,
	TRunResult,
>(options): AgnosticPipeline<TRunOptions, TRunResult, TContext, TReporter>;
```

## Type Parameters

### TRunOptions

`TRunOptions`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ [`PipelineReporter`](../interfaces/PipelineReporter.md) = [`PipelineReporter`](../interfaces/PipelineReporter.md)

### TUserState

`TUserState` = `unknown`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](../interfaces/PipelineRunState.md)<`TUserState`, `TDiagnostic`>

## Parameters

### options

`AgnosticPipelineOptions`<`TRunOptions`, `TContext`, `TReporter`, `TUserState`, `TDiagnostic`, `TRunResult`>

## Returns

`AgnosticPipeline`<`TRunOptions`, `TRunResult`, `TContext`, `TReporter`>
