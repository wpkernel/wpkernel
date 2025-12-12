[**@wpkernel/wp-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / BlockModuleFile

# Interface: BlockModuleFile&lt;TMetadata&gt;

## Type Parameters

### TMetadata

`TMetadata` *extends* 
  \| [`BlockManifestMetadata`](../type-aliases/BlockManifestMetadata.md)
  \| [`BlockRegistrarMetadata`](../type-aliases/BlockRegistrarMetadata.md)

## Properties

### docblock

```ts
readonly docblock: readonly string[];
```

***

### fileName

```ts
readonly fileName: string;
```

***

### metadata

```ts
readonly metadata: TMetadata;
```

***

### namespace

```ts
readonly namespace: string | null;
```

***

### program

```ts
readonly program: PhpProgram;
```
