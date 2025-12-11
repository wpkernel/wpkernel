[**@wpkernel/wp-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / QueueModuleFilesOptions

# Interface: QueueModuleFilesOptions&lt;TFile&gt;

## Type Parameters

### TFile

`TFile` *extends* [`ProgramTargetFile`](ProgramTargetFile.md) = [`ProgramTargetFile`](ProgramTargetFile.md)

## Properties

### files

```ts
readonly files: readonly TFile[];
```

***

### docblockPrefix?

```ts
readonly optional docblockPrefix: readonly string[];
```

***

### filter()?

```ts
readonly optional filter: (file) =&gt; boolean;
```

#### Parameters

##### file

`TFile`

#### Returns

`boolean`
