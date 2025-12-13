[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / CreateWpPhpProgramBuilderOptions

# Interface: CreateWpPhpProgramBuilderOptions<TContext, TInput, TOutput>

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
	build: (builder) => {
		builder.appendProgramStatement(
			buildReturn(buildScalarString('Hello from my plugin!'))
		);
	},
});
```

## Extends

- `Omit`<`BaseCreatePhpProgramBuilderOptions`<`TContext`, `TInput`, `TOutput`>, `"metadata"` \| `"build"`>

## Type Parameters

### TContext

`TContext` _extends_ `PipelineContext` = `PipelineContext`

### TInput

`TInput` _extends_ `BuilderInput` = `BuilderInput`

### TOutput

`TOutput` _extends_ `BuilderOutput` = `BuilderOutput`

## Properties

### build()

```ts
readonly build: (builder, entry) => void | Promise<void>;
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

`void` \| `Promise`<`void`>

---

### filePath

```ts
readonly filePath: string;
```

#### Inherited from

```ts
Omit.filePath;
```

---

### key

```ts
readonly key: string;
```

#### Inherited from

```ts
Omit.key;
```

---

### metadata

```ts
readonly metadata: WpPhpFileMetadata;
```

Metadata for the WordPress PHP file.

#### See

WpPhpFileMetadata

---

### namespace

```ts
readonly namespace: string;
```

#### Inherited from

```ts
Omit.namespace;
```

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

#### Inherited from

```ts
Omit.dependsOn;
```

---

### mode?

```ts
readonly optional mode: HelperMode;
```

#### Inherited from

```ts
Omit.mode;
```

---

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

```ts
Omit.origin;
```

---

### priority?

```ts
readonly optional priority: number;
```

#### Inherited from

```ts
Omit.priority;
```
