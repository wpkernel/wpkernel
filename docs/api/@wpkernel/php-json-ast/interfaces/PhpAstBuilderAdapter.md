[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpAstBuilderAdapter

# Interface: PhpAstBuilderAdapter

## Extends

- [`PhpAstBuilder`](PhpAstBuilder.md)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`addUse`](PhpAstBuilder.md#adduse)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`appendDocblock`](PhpAstBuilder.md#appenddocblock)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`appendProgramStatement`](PhpAstBuilder.md#appendprogramstatement)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`appendStatement`](PhpAstBuilder.md#appendstatement)

---

### context

```ts
readonly context: PhpAstContext;
```

---

### getMetadata()

```ts
getMetadata: () => PhpFileMetadata;
```

#### Returns

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getMetadata`](PhpAstBuilder.md#getmetadata)

---

### getNamespace()

```ts
getNamespace: () => string;
```

#### Returns

`string`

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getNamespace`](PhpAstBuilder.md#getnamespace)

---

### getProgramAst()

```ts
getProgramAst: () => PhpProgram;
```

#### Returns

[`PhpProgram`](../type-aliases/PhpProgram.md)

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getProgramAst`](PhpAstBuilder.md#getprogramast)

---

### getStatements()

```ts
getStatements: () => readonly string[];
```

#### Returns

readonly `string`[]

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getStatements`](PhpAstBuilder.md#getstatements)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`setMetadata`](PhpAstBuilder.md#setmetadata)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`setNamespace`](PhpAstBuilder.md#setnamespace)
