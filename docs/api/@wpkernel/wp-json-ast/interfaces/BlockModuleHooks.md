[**@wpkernel/wp-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / BlockModuleHooks

# Interface: BlockModuleHooks

## Properties

### manifestFile()?

```ts
readonly optional manifestFile: (file) =&gt; void | BlockManifestFile;
```

#### Parameters

##### file

[`BlockManifestFile`](../type-aliases/BlockManifestFile.md)

#### Returns

`void` \| [`BlockManifestFile`](../type-aliases/BlockManifestFile.md)

***

### registrarFile()?

```ts
readonly optional registrarFile: (file) =&gt; void | BlockRegistrarFile;
```

#### Parameters

##### file

[`BlockRegistrarFile`](../type-aliases/BlockRegistrarFile.md)

#### Returns

`void` \| [`BlockRegistrarFile`](../type-aliases/BlockRegistrarFile.md)

***

### renderStub()?

```ts
readonly optional renderStub: (stub, descriptor) =&gt; void | BlockRenderStub;
```

#### Parameters

##### stub

[`BlockRenderStub`](BlockRenderStub.md)

##### descriptor

[`BlockRenderStubDescriptor`](BlockRenderStubDescriptor.md)

#### Returns

`void` \| [`BlockRenderStub`](BlockRenderStub.md)
