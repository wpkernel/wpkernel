[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineExtension

# Interface: PipelineExtension&lt;TPipeline, TContext, TOptions, TArtifact&gt;

A pipeline extension descriptor.

## Type Parameters

### TPipeline

`TPipeline`

### TContext

`TContext`

### TOptions

`TOptions`

### TArtifact

`TArtifact`

## Properties

### register()

```ts
register: (pipeline) =&gt; MaybePromise&lt;PipelineExtensionRegisterOutput&lt;TContext, TOptions, TArtifact&gt;&gt;;
```

#### Parameters

##### pipeline

`TPipeline`

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)&lt;[`PipelineExtensionRegisterOutput`](../type-aliases/PipelineExtensionRegisterOutput.md)&lt;`TContext`, `TOptions`, `TArtifact`&gt;&gt;

***

### key?

```ts
readonly optional key: string;
```
