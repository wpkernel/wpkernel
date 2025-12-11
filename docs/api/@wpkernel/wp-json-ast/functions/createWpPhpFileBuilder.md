[**@wpkernel/wp-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / createWpPhpFileBuilder

# ~~Function: createWpPhpFileBuilder()~~

```ts
function createWpPhpFileBuilder<TContext, TInput, TOutput>(options): BuilderHelper<TContext, TInput, TOutput>;
```

Creates a WordPress PHP file builder.

This is a wrapper around the base PHP file builder that adds WordPress-specific features,
such as automatic generation of file headers and guards.

## Type Parameters

### TContext

`TContext` _extends_ `PipelineContext` = `PipelineContext`

### TInput

`TInput` _extends_ `BuilderInput` = `BuilderInput`

### TOutput

`TOutput` _extends_ `BuilderOutput` = `BuilderOutput`

## Parameters

### options

[`CreateWpPhpFileBuilderOptions`](../type-aliases/CreateWpPhpFileBuilderOptions.md)<`TContext`, `TInput`, `TOutput`>

Options for creating the builder.

## Returns

`BuilderHelper`<`TContext`, `TInput`, `TOutput`>

A builder helper.

## Deprecated

Use `createWpPhpProgramBuilder` instead.

## Example

```ts
import { createWpPhpFileBuilder, buildReturn, buildScalarString } from '@wpkernel/wp-json-ast';

const builder = createWpPhpFileBuilder({
	metadata: {
		namespace: 'MyPlugin',
		pluginName: 'my-plugin',
		description: 'My plugin description.',
	},
	build: (builder) => {
		builder.appendProgramStatement(
			buildReturn(
				buildScalarString('Hello from my plugin!')
			)
		);
	}
});

const result = await builder.apply(context, input);
console.log(result.output.files[0].contents);
```
