[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / CreatePhpFileBuilderOptions

# Interface: CreatePhpFileBuilderOptions&lt;TContext, TInput, TOutput&gt;

## Extends

- `Omit`&lt;[`CreatePhpProgramBuilderOptions`](CreatePhpProgramBuilderOptions.md)&lt;`TContext`, `TInput`, `TOutput`&gt;, `"build"`&gt;

## Type Parameters

### TContext

`TContext` *extends* [`PipelineContext`](PipelineContext.md) = [`PipelineContext`](PipelineContext.md)

### TInput

`TInput` *extends* [`BuilderInput`](BuilderInput.md) = [`BuilderInput`](BuilderInput.md)

### TOutput

`TOutput` *extends* [`BuilderOutput`](BuilderOutput.md) = [`BuilderOutput`](BuilderOutput.md)

## Properties

### build()

```ts
readonly build: (builder, entry) =&gt; void | Promise&lt;void&gt;;
```

#### Parameters

##### builder

[`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

##### entry

[`PhpAstContextEntry`](PhpAstContextEntry.md)

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
readonly metadata: PhpFileMetadata;
```

#### Inherited from

```ts
Omit.metadata
```

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

[`CreateHelperOptions`](CreateHelperOptions.md).[`dependsOn`](CreateHelperOptions.md#dependson)

***

### mode?

```ts
readonly optional mode: HelperMode;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`mode`](CreateHelperOptions.md#mode)

***

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`origin`](CreateHelperOptions.md#origin)

***

### priority?

```ts
readonly optional priority: number;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`priority`](CreateHelperOptions.md#priority)
