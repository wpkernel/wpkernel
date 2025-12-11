[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpAstBuilder

# Interface: PhpAstBuilder

## Extended by

- [`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

## Properties

### addUse()

```ts
addUse: (statement) =&gt; void;
```

#### Parameters

##### statement

`string`

#### Returns

`void`

***

### appendDocblock()

```ts
appendDocblock: (line) =&gt; void;
```

#### Parameters

##### line

`string`

#### Returns

`void`

***

### appendProgramStatement()

```ts
appendProgramStatement: (statement) =&gt; void;
```

#### Parameters

##### statement

[`PhpStmt`](../type-aliases/PhpStmt.md)

#### Returns

`void`

***

### appendStatement()

```ts
appendStatement: (statement) =&gt; void;
```

#### Parameters

##### statement

`string`

#### Returns

`void`

***

### getMetadata()

```ts
getMetadata: () =&gt; PhpFileMetadata;
```

#### Returns

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

***

### getNamespace()

```ts
getNamespace: () =&gt; string;
```

#### Returns

`string`

***

### getProgramAst()

```ts
getProgramAst: () =&gt; PhpProgram;
```

#### Returns

[`PhpProgram`](../type-aliases/PhpProgram.md)

***

### getStatements()

```ts
getStatements: () =&gt; readonly string[];
```

#### Returns

readonly `string`[]

***

### setMetadata()

```ts
setMetadata: (metadata) =&gt; void;
```

#### Parameters

##### metadata

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

#### Returns

`void`

***

### setNamespace()

```ts
setNamespace: (namespace) =&gt; void;
```

#### Parameters

##### namespace

`string`

#### Returns

`void`
