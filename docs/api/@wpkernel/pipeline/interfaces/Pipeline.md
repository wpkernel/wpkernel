[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

***

[@wpkernel/pipeline](../README.md) / Pipeline

# Interface: Pipeline&lt;TRunOptions, TRunResult, TContext, TReporter, TBuildOptions, TArtifact, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TDiagnostic, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper&gt;

A pipeline instance with helper registration and execution methods.

## Type Parameters

### TRunOptions

`TRunOptions`

### TRunResult

`TRunResult`

### TContext

`TContext` *extends* `object`

### TReporter

`TReporter` *extends* [`PipelineReporter`](PipelineReporter.md) = [`PipelineReporter`](PipelineReporter.md)

### TBuildOptions

`TBuildOptions` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TDiagnostic

`TDiagnostic` *extends* [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TFragmentKind

`TFragmentKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` *extends* [`Helper`](Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt; = [`Helper`](Helper.md)&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`&gt;

### TBuilderHelper

`TBuilderHelper` *extends* [`Helper`](Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt; = [`Helper`](Helper.md)&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`&gt;

## Properties

### builderKind

```ts
readonly builderKind: TBuilderKind;
```

***

### builders

```ts
readonly builders: object;
```

#### use()

```ts
use: (helper) =&gt; void;
```

##### Parameters

###### helper

`TBuilderHelper`

##### Returns

`void`

***

### extensions

```ts
readonly extensions: object;
```

#### use()

```ts
use: (extension) =&gt; unknown;
```

##### Parameters

###### extension

`StandardPipelineExtension`&lt;`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`&gt;

##### Returns

`unknown`

***

### fragmentKind

```ts
readonly fragmentKind: TFragmentKind;
```

***

### ir

```ts
readonly ir: object;
```

#### use()

```ts
use: (helper) =&gt; void;
```

##### Parameters

###### helper

`TFragmentHelper`

##### Returns

`void`

***

### run()

```ts
run: (options) =&gt; MaybePromise&lt;TRunResult&gt;;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)&lt;`TRunResult`&gt;

***

### use()

```ts
use: (helper) =&gt; void;
```

#### Parameters

##### helper

`TFragmentHelper` | `TBuilderHelper` | [`Helper`](Helper.md)&lt;`TContext`, `unknown`, `unknown`, `TReporter`, `string`&gt;

#### Returns

`void`
