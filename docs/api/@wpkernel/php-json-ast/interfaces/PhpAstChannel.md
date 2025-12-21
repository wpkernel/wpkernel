[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpAstChannel

# Interface: PhpAstChannel

## Properties

### entries()

```ts
entries: () =&gt; readonly PhpAstContextEntry[];
```

#### Returns

readonly [`PhpAstContextEntry`](PhpAstContextEntry.md)[]

***

### get()

```ts
get: (key) =&gt; PhpAstContextEntry | undefined;
```

#### Parameters

##### key

`string`

#### Returns

[`PhpAstContextEntry`](PhpAstContextEntry.md) \| `undefined`

***

### open()

```ts
open: (options) =&gt; PhpAstContextEntry;
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

***

### reset()

```ts
reset: () =&gt; void;
```

#### Returns

`void`
