[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / createPhpFileBuilder

# Function: createPhpFileBuilder()

```ts
function createPhpFileBuilder<TContext, TInput, TOutput>(
	options
): BuilderHelper<TContext, TInput, TOutput>;
```

## Type Parameters

### TContext

`TContext` _extends_ [`PipelineContext`](../interfaces/PipelineContext.md) = [`PipelineContext`](../interfaces/PipelineContext.md)

### TInput

`TInput` _extends_ [`BuilderInput`](../interfaces/BuilderInput.md) = [`BuilderInput`](../interfaces/BuilderInput.md)

### TOutput

`TOutput` _extends_ [`BuilderOutput`](../interfaces/BuilderOutput.md) = [`BuilderOutput`](../interfaces/BuilderOutput.md)

## Parameters

### options

[`CreatePhpFileBuilderOptions`](../interfaces/CreatePhpFileBuilderOptions.md)<`TContext`, `TInput`, `TOutput`>

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)<`TContext`, `TInput`, `TOutput`>
