[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / createPipeline

# Function: createPipeline()

```ts
function createPipeline&lt;TRunOptions, TBuildOptions, TContext, TReporter, TDraft, TArtifact, TDiagnostic, TRunResult, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper&gt;(options): Pipeline&lt;TRunOptions, TRunResult, TContext, TReporter, TBuildOptions, TArtifact, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TDiagnostic, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper&gt;;
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

`TFragmentKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` *extends* [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt; = [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt;

### TBuilderHelper

`TBuilderHelper` *extends* [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt; = [`Helper`](../interfaces/Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt;

## Parameters

### options

[`CreatePipelineOptions`](../interfaces/CreatePipelineOptions.md)&lt;`TRunOptions`, `TBuildOptions`, `TContext`, `TReporter`, `TDraft`, `TArtifact`, `TDiagnostic`, `TRunResult`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`&gt;

## Returns

[`Pipeline`](../interfaces/Pipeline.md)&lt;`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`&gt;

## Example

```ts
const pipeline = createPipeline({
  fragmentKind: 'fragment',
  builderKind: 'builder',
  createContext: () =&gt; ({ reporter }),
  createFragmentState: () =&gt; ({}),
  finalizeFragmentState: ({ draft }) =&gt; draft,
  createRunResult: ({ artifact, diagnostics }) =&gt; ({ artifact, diagnostics }),
  createBuildOptions: () =&gt; ({}),
  createFragmentArgs: ({ helper, draft, context }) =&gt; ({
    helper,
    context,
    options: {},
    buildOptions: {},
    draft,
  }),
  createBuilderArgs: ({ helper, artifact, context }) =&gt; ({
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
