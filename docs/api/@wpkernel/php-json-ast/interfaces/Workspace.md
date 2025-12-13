[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / Workspace

# Interface: Workspace

## Properties

### cwd()

```ts
cwd: () =&gt; string;
```

#### Returns

`string`

***

### exists()

```ts
exists: (target) =&gt; Promise&lt;boolean&gt;;
```

#### Parameters

##### target

`string`

#### Returns

`Promise`&lt;`boolean`&gt;

***

### resolve()

```ts
resolve: (...parts) =&gt; string;
```

#### Parameters

##### parts

...`string`[]

#### Returns

`string`

***

### root

```ts
readonly root: string;
```

***

### write()

```ts
write: (file, contents, options?) =&gt; Promise&lt;void&gt;;
```

#### Parameters

##### file

`string`

##### contents

`string` | `Buffer`&lt;`ArrayBufferLike`&gt;

##### options?

[`WorkspaceWriteOptions`](WorkspaceWriteOptions.md)

#### Returns

`Promise`&lt;`void`&gt;
