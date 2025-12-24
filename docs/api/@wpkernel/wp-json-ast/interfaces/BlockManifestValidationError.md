[**@wpkernel/wp-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / BlockManifestValidationError

# Interface: BlockManifestValidationError

A validation error for a block manifest.

## See

BlockManifestMetadata

## Properties

### block

```ts
readonly block: string;
```

The name of the block.

***

### code

```ts
readonly code: 
  | "block-manifest/missing-directory"
  | "block-manifest/invalid-directory"
  | "block-manifest/missing-manifest"
  | "block-manifest/invalid-manifest"
  | "block-manifest/invalid-render";
```

The error code.

***

### field

```ts
readonly field: "directory" | "manifest" | "render";
```

The field that failed validation.

***

### message

```ts
readonly message: string;
```

The error message.

***

### value?

```ts
readonly optional value: unknown;
```

The invalid value.
