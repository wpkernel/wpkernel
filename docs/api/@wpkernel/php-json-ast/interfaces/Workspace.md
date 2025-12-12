[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / Workspace

# Interface: Workspace

## Properties

### cwd()

```ts
cwd: () => string;
```

#### Returns

`string`

---

### exists()

```ts
exists: (target) => Promise<boolean>;
```

#### Parameters

##### target

`string`

#### Returns

`Promise`<`boolean`>

---

### resolve()

```ts
resolve: (...parts) => string;
```

#### Parameters

##### parts

...`string`[]

#### Returns

`string`

---

### root

```ts
readonly root: string;
```

---

### write()

```ts
write: (file, contents, options?) => Promise<void>;
```

#### Parameters

##### file

`string`

##### contents

`string` | `Buffer`<`ArrayBufferLike`>

##### options?

[`WorkspaceWriteOptions`](WorkspaceWriteOptions.md)

#### Returns

`Promise`<`void`>
