[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / BuilderHelper

# Type Alias: BuilderHelper<TContext, TInput, TOutput>

```ts
type BuilderHelper<TContext, TInput, TOutput> = Helper<
	TContext,
	TInput,
	TOutput,
	TContext['reporter'],
	'builder'
>;
```

## Type Parameters

### TContext

`TContext` _extends_ [`PipelineContext`](../interfaces/PipelineContext.md) = [`PipelineContext`](../interfaces/PipelineContext.md)

### TInput

`TInput` _extends_ [`BuilderInput`](../interfaces/BuilderInput.md) = [`BuilderInput`](../interfaces/BuilderInput.md)

### TOutput

`TOutput` _extends_ [`BuilderOutput`](../interfaces/BuilderOutput.md) = [`BuilderOutput`](../interfaces/BuilderOutput.md)
