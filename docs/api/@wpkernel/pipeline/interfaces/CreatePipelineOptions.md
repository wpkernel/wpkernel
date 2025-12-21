[**@wpkernel/pipeline v0.12.6-beta.2**](../README.md)

***

[@wpkernel/pipeline](../README.md) / CreatePipelineOptions

# Interface: CreatePipelineOptions&lt;TRunOptions, TBuildOptions, TContext, TReporter, TDraft, TArtifact, TDiagnostic, TRunResult, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper&gt;

Options for creating a pipeline.

## Type Parameters

### TRunOptions

`TRunOptions`

### TBuildOptions

`TBuildOptions`

### TContext

`TContext` *extends* `object`

### TReporter

`TReporter` *extends* [`PipelineReporter`](PipelineReporter.md) = [`PipelineReporter`](PipelineReporter.md)

### TDraft

`TDraft` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TDiagnostic

`TDiagnostic` *extends* [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](PipelineRunState.md)&lt;`TArtifact`, `TDiagnostic`&gt;

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

`TFragmentHelper` *extends* [`Helper`](Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt; = [`Helper`](Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt;

### TBuilderHelper

`TBuilderHelper` *extends* [`Helper`](Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt; = [`Helper`](Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt;

## Properties

### createBuilderArgs()

```ts
readonly createBuilderArgs: (options) =&gt; HelperApplyOptions&lt;TContext, TBuilderInput, TBuilderOutput, TReporter&gt;;
```

#### Parameters

##### options

###### artifact

`TArtifact`

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### helper

`TBuilderHelper`

###### options

`TRunOptions`

#### Returns

[`HelperApplyOptions`](HelperApplyOptions.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`&gt;

***

### createBuildOptions()

```ts
readonly createBuildOptions: (options) =&gt; TBuildOptions;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

`TBuildOptions`

***

### createContext()

```ts
readonly createContext: (options) =&gt; TContext;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

`TContext`

***

### createFragmentArgs()

```ts
readonly createFragmentArgs: (options) =&gt; HelperApplyOptions&lt;TContext, TFragmentInput, TFragmentOutput, TReporter&gt;;
```

#### Parameters

##### options

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### draft

`TDraft`

###### helper

`TFragmentHelper`

###### options

`TRunOptions`

#### Returns

[`HelperApplyOptions`](HelperApplyOptions.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`&gt;

***

### createFragmentState()

```ts
readonly createFragmentState: (options) =&gt; TDraft;
```

#### Parameters

##### options

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### options

`TRunOptions`

#### Returns

`TDraft`

***

### finalizeFragmentState()

```ts
readonly finalizeFragmentState: (options) =&gt; TArtifact;
```

#### Parameters

##### options

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### draft

`TDraft`

###### helpers

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)&lt;`TFragmentKind`&gt;

###### options

`TRunOptions`

#### Returns

`TArtifact`

***

### builderKind?

```ts
readonly optional builderKind: TBuilderKind;
```

***

### builderProvidedKeys?

```ts
readonly optional builderProvidedKeys: readonly string[];
```

Helper keys that should be treated as “already satisfied” for builder
dependency resolution (e.g. builders depending on IR helpers that are
executed in a different pipeline stage).

***

### createConflictDiagnostic()?

```ts
readonly optional createConflictDiagnostic: (options) =&gt; TDiagnostic;
```

#### Parameters

##### options

###### existing

`TFragmentHelper` \| `TBuilderHelper`

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

***

### createError()?

```ts
readonly optional createError: (code, message) =&gt; Error;
```

#### Parameters

##### code

`string`

##### message

`string`

#### Returns

`Error`

***

### createExtensionHookOptions()?

```ts
readonly optional createExtensionHookOptions: (options) =&gt; PipelineExtensionHookOptions&lt;TContext, TRunOptions, TArtifact&gt;;
```

#### Parameters

##### options

###### artifact

`TArtifact`

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### lifecycle

`PipelineExtensionLifecycle`

###### options

`TRunOptions`

#### Returns

[`PipelineExtensionHookOptions`](PipelineExtensionHookOptions.md)&lt;`TContext`, `TRunOptions`, `TArtifact`&gt;

***

### createMissingDependencyDiagnostic()?

```ts
readonly optional createMissingDependencyDiagnostic: (options) =&gt; TDiagnostic;
```

#### Parameters

##### options

###### dependency

`string`

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

***

### createRunResult()?

```ts
readonly optional createRunResult: (options) =&gt; TRunResult;
```

#### Parameters

##### options

###### artifact

`TArtifact`

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### diagnostics

readonly `TDiagnostic`[]

###### helpers

[`PipelineExecutionMetadata`](PipelineExecutionMetadata.md)&lt;`TFragmentKind`, `TBuilderKind`&gt;

###### options

`TRunOptions`

###### steps

readonly [`PipelineStep`](PipelineStep.md)&lt;`string`&gt;[]

#### Returns

`TRunResult`

***

### createUnusedHelperDiagnostic()?

```ts
readonly optional createUnusedHelperDiagnostic: (options) =&gt; TDiagnostic;
```

#### Parameters

##### options

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

***

### fragmentKind?

```ts
readonly optional fragmentKind: TFragmentKind;
```

***

### fragmentProvidedKeys?

```ts
readonly optional fragmentProvidedKeys: readonly string[];
```

Helper keys that should be treated as "already satisfied" for fragment
dependency resolution (useful when a run intentionally omits certain
fragments).

***

### onDiagnostic()?

```ts
readonly optional onDiagnostic: (options) =&gt; void;
```

Optional hook invoked whenever a diagnostic is emitted during a run.

Consumers can stream diagnostics to logs or UI shells while the
pipeline executes instead of waiting for the final run result.

#### Parameters

##### options

###### diagnostic

`TDiagnostic`

###### reporter

`TReporter`

#### Returns

`void`

***

### onExtensionRollbackError()?

```ts
readonly optional onExtensionRollbackError: (options) =&gt; void;
```

#### Parameters

##### options

###### context

`TContext`

###### error

`unknown`

###### errorMetadata

[`PipelineExtensionRollbackErrorMetadata`](PipelineExtensionRollbackErrorMetadata.md)

###### extensionKeys

readonly `string`[]

###### hookSequence

readonly `string`[]

#### Returns

`void`

***

### onHelperRollbackError()?

```ts
readonly optional onHelperRollbackError: (options) =&gt; void;
```

#### Parameters

##### options

###### context

`TContext`

###### error

`unknown`

###### errorMetadata

[`PipelineExtensionRollbackErrorMetadata`](PipelineExtensionRollbackErrorMetadata.md)

###### helper

`TFragmentHelper` \| `TBuilderHelper`

#### Returns

`void`
