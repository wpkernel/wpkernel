[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / createWpPhpProgramBuilder

# Function: createWpPhpProgramBuilder()

```ts
function createWpPhpProgramBuilder<TContext, TInput, TOutput>(options): BuilderHelper<TContext, TInput, TOutput>;
```

Creates a WordPress PHP program builder.

This is a wrapper around the base PHP program builder that adds WordPress-specific features,
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

[`CreateWpPhpProgramBuilderOptions`](../interfaces/CreateWpPhpProgramBuilderOptions.md)<`TContext`, `TInput`, `TOutput`>

Options for creating the builder.

## Returns

`BuilderHelper`<`TContext`, `TInput`, `TOutput`>

A builder helper.

## Example

```ts
import { createWpPhpProgramBuilder, buildReturn, buildScalarString } from '@wpkernel/wp-json-ast';

const builder = createWpPhpProgramBuilder({
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
