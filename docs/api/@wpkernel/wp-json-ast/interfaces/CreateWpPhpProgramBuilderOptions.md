[**@wpkernel/wp-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / CreateWpPhpProgramBuilderOptions

# Interface: CreateWpPhpProgramBuilderOptions&lt;TContext, TInput, TOutput&gt;

Options for creating a WordPress PHP program builder.

## Example

```ts
import { createWpPhpProgramBuilder } from '@wpkernel/wp-json-ast';

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
```

## Extends

- `Omit`&lt;`BaseCreatePhpProgramBuilderOptions`&lt;`TContext`, `TInput`, `TOutput`&gt;, `"metadata"` \| `"build"`&gt;

## Type Parameters

### TContext

`TContext` *extends* `PipelineContext` = `PipelineContext`

### TInput

`TInput` *extends* `BuilderInput` = `BuilderInput`

### TOutput

`TOutput` *extends* `BuilderOutput` = `BuilderOutput`

## Properties

### build()

```ts
readonly build: (builder, entry) =&gt; void | Promise&lt;void&gt;;
```

The build function that constructs the PHP AST.

#### Parameters

##### builder

`PhpAstBuilderAdapter`

The PHP AST builder adapter.

##### entry

`PhpAstContextEntry`

The PHP AST context entry.

#### Returns

`void` \| `Promise`&lt;`void`&gt;

***

### filePath

```ts
readonly filePath: string;
```

#### Inherited from

```ts
Omit.filePath
```

***

### key

```ts
readonly key: string;
```

#### Inherited from

```ts
Omit.key
```

***

### metadata

```ts
readonly metadata: WpPhpFileMetadata;
```

Metadata for the WordPress PHP file.

#### See

WpPhpFileMetadata

***

### namespace

```ts
readonly namespace: string;
```

#### Inherited from

```ts
Omit.namespace
```

***

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

#### Inherited from

```ts
Omit.dependsOn
```

***

### mode?

```ts
readonly optional mode: HelperMode;
```

#### Inherited from

```ts
Omit.mode
```

***

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

```ts
Omit.origin
```

***

### priority?

```ts
readonly optional priority: number;
```

#### Inherited from

```ts
Omit.priority
```
