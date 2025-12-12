[**@wpkernel/pipeline v0.12.3-beta.2**](../README.md)

---

[@wpkernel/pipeline](../README.md) / CreatePipelineOptions

# Interface: CreatePipelineOptions<TRunOptions, TBuildOptions, TContext, TReporter, TDraft, TArtifact, TDiagnostic, TRunResult, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper>

Options for creating a pipeline.

## Type Parameters

### TRunOptions

`TRunOptions`

### TBuildOptions

`TBuildOptions`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ [`PipelineReporter`](PipelineReporter.md) = [`PipelineReporter`](PipelineReporter.md)

### TDraft

`TDraft` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](PipelineRunState.md)<`TArtifact`, `TDiagnostic`>

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

`TFragmentHelper` _extends_ [`Helper`](Helper.md)<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`> = [`Helper`](Helper.md)<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`>

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](Helper.md)<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`> = [`Helper`](Helper.md)<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`>

## Properties

### createBuilderArgs()

```ts
readonly createBuilderArgs: (options) => HelperApplyOptions<TContext, TBuilderInput, TBuilderOutput, TReporter>;
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

[`HelperApplyOptions`](HelperApplyOptions.md)<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`>

---

### createBuildOptions()

```ts
readonly createBuildOptions: (options) => TBuildOptions;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

`TBuildOptions`

---

### createContext()

```ts
readonly createContext: (options) => TContext;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

`TContext`

---

### createFragmentArgs()

```ts
readonly createFragmentArgs: (options) => HelperApplyOptions<TContext, TFragmentInput, TFragmentOutput, TReporter>;
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

[`HelperApplyOptions`](HelperApplyOptions.md)<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`>

---

### createFragmentState()

```ts
readonly createFragmentState: (options) => TDraft;
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

---

### finalizeFragmentState()

```ts
readonly finalizeFragmentState: (options) => TArtifact;
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

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)<`TFragmentKind`>

###### options

`TRunOptions`

#### Returns

`TArtifact`

---

### builderKind?

```ts
readonly optional builderKind: TBuilderKind;
```

---

### builderProvidedKeys?

```ts
readonly optional builderProvidedKeys: readonly string[];
```

Helper keys that should be treated as “already satisfied” for builder
dependency resolution (e.g. builders depending on IR helpers that are
executed in a different pipeline stage).

---

### createConflictDiagnostic()?

```ts
readonly optional createConflictDiagnostic: (options) => TDiagnostic;
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

---

### createError()?

```ts
readonly optional createError: (code, message) => Error;
```

#### Parameters

##### code

`string`

##### message

`string`

#### Returns

`Error`

---

### createExtensionHookOptions()?

```ts
readonly optional createExtensionHookOptions: (options) => PipelineExtensionHookOptions<TContext, TRunOptions, TArtifact>;
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

[`PipelineExtensionLifecycle`](../type-aliases/PipelineExtensionLifecycle.md)

###### options

`TRunOptions`

#### Returns

[`PipelineExtensionHookOptions`](PipelineExtensionHookOptions.md)<`TContext`, `TRunOptions`, `TArtifact`>

---

### createMissingDependencyDiagnostic()?

```ts
readonly optional createMissingDependencyDiagnostic: (options) => TDiagnostic;
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

---

### createRunResult()?

```ts
readonly optional createRunResult: (options) => TRunResult;
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

[`PipelineExecutionMetadata`](PipelineExecutionMetadata.md)<`TFragmentKind`, `TBuilderKind`>

###### options

`TRunOptions`

###### steps

readonly [`PipelineStep`](PipelineStep.md)<[`HelperKind`](../type-aliases/HelperKind.md)>[]

#### Returns

`TRunResult`

---

### createUnusedHelperDiagnostic()?

```ts
readonly optional createUnusedHelperDiagnostic: (options) => TDiagnostic;
```

#### Parameters

##### options

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

---

### fragmentKind?

```ts
readonly optional fragmentKind: TFragmentKind;
```

---

### fragmentProvidedKeys?

```ts
readonly optional fragmentProvidedKeys: readonly string[];
```

Helper keys that should be treated as "already satisfied" for fragment
dependency resolution (useful when a run intentionally omits certain
fragments).

---

### onDiagnostic()?

```ts
readonly optional onDiagnostic: (options) => void;
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

---

### onExtensionRollbackError()?

```ts
readonly optional onExtensionRollbackError: (options) => void;
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

---

### onHelperRollbackError()?

```ts
readonly optional onHelperRollbackError: (options) => void;
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
