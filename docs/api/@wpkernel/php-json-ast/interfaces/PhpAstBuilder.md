[**@wpkernel/php-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpAstBuilder

# Interface: PhpAstBuilder

## Extended by

- [`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

## Properties

### addUse()

```ts
addUse: (statement) => void;
```

#### Parameters

##### statement

`string`

#### Returns

`void`

---

### appendDocblock()

```ts
appendDocblock: (line) => void;
```

#### Parameters

##### line

`string`

#### Returns

`void`

---

### appendProgramStatement()

```ts
appendProgramStatement: (statement) => void;
```

#### Parameters

##### statement

[`PhpStmt`](../type-aliases/PhpStmt.md)

#### Returns

`void`

---

### appendStatement()

```ts
appendStatement: (statement) => void;
```

#### Parameters

##### statement

`string`

#### Returns

`void`

---

### getMetadata()

```ts
getMetadata: () => PhpFileMetadata;
```

#### Returns

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

---

### getNamespace()

```ts
getNamespace: () => string;
```

#### Returns

`string`

---

### getProgramAst()

```ts
getProgramAst: () => PhpProgram;
```

#### Returns

[`PhpProgram`](../type-aliases/PhpProgram.md)

---

### getStatements()

```ts
getStatements: () => readonly string[];
```

#### Returns

readonly `string`[]

---

### setMetadata()

```ts
setMetadata: (metadata) => void;
```

#### Parameters

##### metadata

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

#### Returns

`void`

---

### setNamespace()

```ts
setNamespace: (namespace) => void;
```

#### Parameters

##### namespace

`string`

#### Returns

`void`
