[**@wpkernel/wp-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ProgramTargetFile

# Interface: ProgramTargetFile&lt;TMetadata&gt;

## Type Parameters

### TMetadata

`TMetadata` *extends* `PhpFileMetadata` = `PhpFileMetadata`

## Properties

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

### program

```ts
readonly program: PhpProgram;
```

***

### docblock?

```ts
readonly optional docblock: readonly string[];
```

***

### statements?

```ts
readonly optional statements: readonly string[];
```

***

### uses?

```ts
readonly optional uses: readonly string[];
```
