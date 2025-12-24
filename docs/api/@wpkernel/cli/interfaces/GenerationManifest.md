[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

***

[@wpkernel/cli](../README.md) / GenerationManifest

# Interface: GenerationManifest

Represents the manifest of generated files and resources.

## Properties

### resources

```ts
readonly resources: Record&lt;string, GenerationManifestResourceEntry&gt;;
```

***

### version

```ts
readonly version: 1;
```

***

### blocks?

```ts
readonly optional blocks: object;
```

#### files

```ts
readonly files: readonly GenerationManifestFilePair[];
```

***

### phpIndex?

```ts
readonly optional phpIndex: GenerationManifestFile;
```

***

### pluginLoader?

```ts
readonly optional pluginLoader: GenerationManifestFile;
```

***

### runtime?

```ts
readonly optional runtime: GenerationManifestRuntimeState;
```
