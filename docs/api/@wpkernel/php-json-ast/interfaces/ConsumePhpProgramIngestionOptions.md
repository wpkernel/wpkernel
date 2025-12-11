[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / ConsumePhpProgramIngestionOptions

# Interface: ConsumePhpProgramIngestionOptions

## Properties

### context

```ts
readonly context: PipelineContext;
```

---

### source

```ts
readonly source: PhpProgramIngestionSource;
```

---

### defaultMetadata?

```ts
readonly optional defaultMetadata: PhpFileMetadata;
```

---

### reporter?

```ts
readonly optional reporter: Reporter;
```

---

### resolveFilePath()?

```ts
readonly optional resolveFilePath: (message) => string;
```

#### Parameters

##### message

[`PhpProgramIngestionMessage`](PhpProgramIngestionMessage.md)

#### Returns

`string`
