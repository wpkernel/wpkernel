[**@wpkernel/pipeline v0.12.3-beta.2**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineExtension

# Interface: PipelineExtension<TPipeline, TContext, TOptions, TArtifact>

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
register: (pipeline) =>
	MaybePromise<
		PipelineExtensionRegisterOutput<TContext, TOptions, TArtifact>
	>;
```

#### Parameters

##### pipeline

`TPipeline`

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)<[`PipelineExtensionRegisterOutput`](../type-aliases/PipelineExtensionRegisterOutput.md)<`TContext`, `TOptions`, `TArtifact`>>

---

### key?

```ts
readonly optional key: string;
```
