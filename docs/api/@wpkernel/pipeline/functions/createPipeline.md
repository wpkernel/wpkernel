[**@wpkernel/pipeline v0.12.3-beta.2**](../README.md)

---

[@wpkernel/pipeline](../README.md) / createPipeline

# Function: createPipeline()

```ts
function createPipeline<
	TRunOptions,
	TBuildOptions,
	TContext,
	TReporter,
	TDraft,
	TArtifact,
	TDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper,
>(
	options
): Pipeline<
	TRunOptions,
	TRunResult,
	TContext,
	TReporter,
	TBuildOptions,
	TArtifact,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TDiagnostic,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper
>;
```

Creates a pipeline orchestrator-the execution engine that powers WPKernel's code generation stack.

The pipeline coordinates helper registration, dependency resolution, execution, diagnostics, and
extension hooks. Refer to the package README for a full walkthrough and advanced usage examples.

## Type Parameters

### TRunOptions

`TRunOptions`

### TBuildOptions

`TBuildOptions`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ [`PipelineReporter`](../interfaces/PipelineReporter.md) = [`PipelineReporter`](../interfaces/PipelineReporter.md)

### TDraft

`TDraft` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](../interfaces/PipelineRunState.md)<`TArtifact`, `TDiagnostic`>

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` _extends_ [`Helper`](../interfaces/Helper.md)<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`> = [`Helper`](../interfaces/Helper.md)<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`>

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](../interfaces/Helper.md)<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`> = [`Helper`](../interfaces/Helper.md)<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`>

## Parameters

### options

[`CreatePipelineOptions`](../interfaces/CreatePipelineOptions.md)<`TRunOptions`, `TBuildOptions`, `TContext`, `TReporter`, `TDraft`, `TArtifact`, `TDiagnostic`, `TRunResult`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`>

## Returns

[`Pipeline`](../interfaces/Pipeline.md)<`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`>

## Example

```ts
const pipeline = createPipeline({
  fragmentKind: 'fragment',
  builderKind: 'builder',
  createContext: () => ({ reporter }),
  createFragmentState: () => ({}),
  finalizeFragmentState: ({ draft }) => draft,
  createRunResult: ({ artifact, diagnostics }) => ({ artifact, diagnostics }),
  createBuildOptions: () => ({}),
  createFragmentArgs: ({ helper, draft, context }) => ({
    helper,
    context,
    options: {},
    buildOptions: {},
    draft,
  }),
  createBuilderArgs: ({ helper, artifact, context }) => ({
    helper,
    context,
    options: {},
    buildOptions: {},
    artifact,
  }),
});

pipeline.ir.use(createHelper({...}));
pipeline.extensions.use(createPipelineExtension({ key: 'acme.audit' }));
const result = await pipeline.run({});
console.log(result.diagnostics.length);
```
