[**@wpkernel/pipeline v0.12.3-beta.2**](../README.md)

---

[@wpkernel/pipeline](../README.md) / Pipeline

# Interface: Pipeline<TRunOptions, TRunResult, TContext, TReporter, TBuildOptions, TArtifact, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TDiagnostic, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper>

A pipeline instance with helper registration and execution methods.

## Type Parameters

### TRunOptions

`TRunOptions`

### TRunResult

`TRunResult`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ [`PipelineReporter`](PipelineReporter.md) = [`PipelineReporter`](PipelineReporter.md)

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

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` _extends_ [`Helper`](Helper.md)<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`> = [`Helper`](Helper.md)<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`>

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](Helper.md)<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`> = [`Helper`](Helper.md)<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`>

## Properties

### builderKind

```ts
readonly builderKind: TBuilderKind;
```

---

### builders

```ts
readonly builders: object;
```

#### use()

```ts
use: (helper) => void;
```

##### Parameters

###### helper

`TBuilderHelper`

##### Returns

`void`

---

### extensions

```ts
readonly extensions: object;
```

#### use()

```ts
use: (extension) => unknown;
```

##### Parameters

###### extension

[`PipelineExtension`](PipelineExtension.md)<`Pipeline`<`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`>, `TContext`, `TRunOptions`, `TArtifact`>

##### Returns

`unknown`

---

### fragmentKind

```ts
readonly fragmentKind: TFragmentKind;
```

---

### ir

```ts
readonly ir: object;
```

#### use()

```ts
use: (helper) => void;
```

##### Parameters

###### helper

`TFragmentHelper`

##### Returns

`void`

---

### run()

```ts
run: (options) => MaybePromise<TRunResult>;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)<`TRunResult`>

---

### use()

```ts
use: (helper) => void;
```

#### Parameters

##### helper

`TFragmentHelper` | `TBuilderHelper` | [`Helper`](Helper.md)<`TContext`, `unknown`, `unknown`, `TReporter`, [`HelperKind`](../type-aliases/HelperKind.md)>

#### Returns

`void`
