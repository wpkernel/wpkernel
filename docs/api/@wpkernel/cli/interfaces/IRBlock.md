[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / IRBlock

# Interface: IRBlock

Represents an Intermediate Representation (IR) for a block.

## Properties

### directory

```ts
directory: string;
```

The directory where the block is defined.

***

### hash

```ts
hash: IRHashProvenance;
```

Provenance hash for the discovered block.

***

### hasRender

```ts
hasRender: boolean;
```

Indicates if the block has a render function.

***

### id

```ts
id: string;
```

Stable identifier for the block entry.

***

### key

```ts
key: string;
```

A unique key for the block.

***

### manifestSource

```ts
manifestSource: string;
```

The source path of the block's manifest.

***

### registrarFileName?

```ts
optional registrarFileName: string;
```

Optional override for the registrar file name.

***

### renderStub?

```ts
optional renderStub: object;
```

Optional render stub defaults chosen by fragments.

#### message?

```ts
optional message: string;
```

#### textDomain?

```ts
optional textDomain: string;
```
