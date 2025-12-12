[**@wpkernel/php-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpProgramIngestionMessage

# Interface: PhpProgramIngestionMessage

## Properties

### file

```ts
readonly file: string;
```

***

### program

```ts
readonly program: PhpProgram;
```

***

### codemod?

```ts
readonly optional codemod: PhpProgramCodemodResult;
```

***

### docblock?

```ts
readonly optional docblock: readonly string[];
```

***

### metadata?

```ts
readonly optional metadata: PhpFileMetadata;
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
