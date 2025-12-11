[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpAstChannel

# Interface: PhpAstChannel

## Properties

### entries()

```ts
entries: () => readonly PhpAstContextEntry[];
```

#### Returns

readonly [`PhpAstContextEntry`](PhpAstContextEntry.md)[]

---

### get()

```ts
get: (key) => PhpAstContextEntry | undefined;
```

#### Parameters

##### key

`string`

#### Returns

[`PhpAstContextEntry`](PhpAstContextEntry.md) \| `undefined`

---

### open()

```ts
open: (options) => PhpAstContextEntry;
```

#### Parameters

##### options

###### filePath

`string`

###### key

`string`

###### metadata

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

###### namespace

`string`

#### Returns

[`PhpAstContextEntry`](PhpAstContextEntry.md)

---

### reset()

```ts
reset: () => void;
```

#### Returns

`void`
