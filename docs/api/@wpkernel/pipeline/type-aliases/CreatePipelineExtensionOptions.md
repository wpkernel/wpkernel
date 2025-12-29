[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

---

[@wpkernel/pipeline](../README.md) / CreatePipelineExtensionOptions

# Type Alias: CreatePipelineExtensionOptions<TPipeline, TContext, TOptions, TArtifact>

```ts
type CreatePipelineExtensionOptions<TPipeline, TContext, TOptions, TArtifact> =
	| CreatePipelineExtensionWithRegister<
			TPipeline,
			TContext,
			TOptions,
			TArtifact
	  >
	| CreatePipelineExtensionWithSetup<
			TPipeline,
			TContext,
			TOptions,
			TArtifact
	  >;
```

## Type Parameters

### TPipeline

`TPipeline`

### TContext

`TContext`

### TOptions

`TOptions`

### TArtifact

`TArtifact`
