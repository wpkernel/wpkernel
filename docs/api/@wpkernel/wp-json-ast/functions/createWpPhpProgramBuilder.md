[**@wpkernel/wp-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / createWpPhpProgramBuilder

# Function: createWpPhpProgramBuilder()

```ts
function createWpPhpProgramBuilder&lt;TContext, TInput, TOutput&gt;(options): BuilderHelper&lt;TContext, TInput, TOutput&gt;;
```

Creates a WordPress PHP program builder.

This is a wrapper around the base PHP program builder that adds WordPress-specific features,
such as automatic generation of file headers and guards.

## Type Parameters

### TContext

`TContext` *extends* `PipelineContext` = `PipelineContext`

### TInput

`TInput` *extends* `BuilderInput` = `BuilderInput`

### TOutput

`TOutput` *extends* `BuilderOutput` = `BuilderOutput`

## Parameters

### options

[`CreateWpPhpProgramBuilderOptions`](../interfaces/CreateWpPhpProgramBuilderOptions.md)&lt;`TContext`, `TInput`, `TOutput`&gt;

Options for creating the builder.

## Returns

`BuilderHelper`&lt;`TContext`, `TInput`, `TOutput`&gt;

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
	build: (builder) =&gt; {
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
