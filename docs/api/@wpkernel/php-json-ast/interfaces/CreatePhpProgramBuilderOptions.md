[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / CreatePhpProgramBuilderOptions

# Interface: CreatePhpProgramBuilderOptions<TContext, TInput, TOutput>

## Extends

- `Pick`<[`CreateHelperOptions`](CreateHelperOptions.md)<`TContext`, `TInput`, `TOutput`>, `"dependsOn"` \| `"mode"` \| `"priority"` \| `"origin"`>

## Type Parameters

### TContext

`TContext` _extends_ [`PipelineContext`](PipelineContext.md) = [`PipelineContext`](PipelineContext.md)

### TInput

`TInput` _extends_ [`BuilderInput`](BuilderInput.md) = [`BuilderInput`](BuilderInput.md)

### TOutput

`TOutput` _extends_ [`BuilderOutput`](BuilderOutput.md) = [`BuilderOutput`](BuilderOutput.md)

## Properties

### build()

```ts
readonly build: (builder, entry) => void | Promise<void>;
```

#### Parameters

##### builder

[`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

##### entry

[`PhpAstContextEntry`](PhpAstContextEntry.md)

#### Returns

`void` \| `Promise`<`void`>

---

### filePath

```ts
readonly filePath: string;
```

---

### key

```ts
readonly key: string;
```

---

### metadata

```ts
readonly metadata: PhpFileMetadata;
```

---

### namespace

```ts
readonly namespace: string;
```

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`dependsOn`](CreateHelperOptions.md#dependson)

---

### mode?

```ts
readonly optional mode: HelperMode;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`mode`](CreateHelperOptions.md#mode)

---

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`origin`](CreateHelperOptions.md#origin)

---

### priority?

```ts
readonly optional priority: number;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`priority`](CreateHelperOptions.md#priority)
