[**@wpkernel/wp-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / createWpPhpFileBuilder

# ~~Function: createWpPhpFileBuilder()~~

```ts
function createWpPhpFileBuilder&lt;TContext, TInput, TOutput&gt;(options): BuilderHelper&lt;TContext, TInput, TOutput&gt;;
```

Creates a WordPress PHP file builder.

This is a wrapper around the base PHP file builder that adds WordPress-specific features,
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

[`CreateWpPhpFileBuilderOptions`](../type-aliases/CreateWpPhpFileBuilderOptions.md)&lt;`TContext`, `TInput`, `TOutput`&gt;

Options for creating the builder.

## Returns

`BuilderHelper`&lt;`TContext`, `TInput`, `TOutput`&gt;

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
