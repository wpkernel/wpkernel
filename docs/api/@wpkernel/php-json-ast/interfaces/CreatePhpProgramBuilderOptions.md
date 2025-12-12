[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / CreatePhpProgramBuilderOptions

# Interface: CreatePhpProgramBuilderOptions&lt;TContext, TInput, TOutput&gt;

## Extends

- `Pick`&lt;[`CreateHelperOptions`](CreateHelperOptions.md)&lt;`TContext`, `TInput`, `TOutput`&gt;, `"dependsOn"` \| `"mode"` \| `"priority"` \| `"origin"`&gt;

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

***

### key

```ts
readonly key: string;
```

***

### metadata

```ts
readonly metadata: PhpFileMetadata;
```

***

### namespace

```ts
readonly namespace: string;
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
