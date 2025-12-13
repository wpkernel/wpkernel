[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ProgramTargetFile

# Interface: ProgramTargetFile<TMetadata>

## Type Parameters

### TMetadata

`TMetadata` _extends_ `PhpFileMetadata` = `PhpFileMetadata`

## Properties

### fileName

```ts
readonly fileName: string;
```

---

### metadata

```ts
readonly metadata: TMetadata;
```

---

### program

```ts
readonly program: PhpProgram;
```

---

### docblock?

```ts
readonly optional docblock: readonly string[];
```

---

### statements?

```ts
readonly optional statements: readonly string[];
```

---

### uses?

```ts
readonly optional uses: readonly string[];
```
