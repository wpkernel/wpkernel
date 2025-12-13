[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / AdapterExtensionContext

# Interface: AdapterExtensionContext<TConfigSurface, TIr>

Execution context provided to adapter extensions.

## Extends

- [`AdapterContext`](AdapterContext.md)<`TConfigSurface`, `TIr`>

## Type Parameters

### TConfigSurface

`TConfigSurface` = `unknown`

### TIr

`TIr` = `unknown`

## Properties

### config

```ts
config: TConfigSurface;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`config`](AdapterContext.md#config)

---

### formatPhp()

```ts
formatPhp: (filePath, contents) => Promise<string>;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`<`string`>

---

### formatTs()

```ts
formatTs: (filePath, contents) => Promise<string>;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`<`string`>

---

### namespace

```ts
namespace: string;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`namespace`](AdapterContext.md#namespace)

---

### outputDir

```ts
outputDir: string;
```

---

### queueFile()

```ts
queueFile: (filePath, contents) => Promise<void>;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`<`void`>

---

### reporter

```ts
reporter: Reporter;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`reporter`](AdapterContext.md#reporter)

---

### tempDir

```ts
tempDir: string;
```

---

### updateIr()

```ts
updateIr: (ir) => void;
```

#### Parameters

##### ir

`TIr`

#### Returns

`void`

---

### configDirectory?

```ts
optional configDirectory: string;
```

---

### ir?

```ts
optional ir: TIr;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`ir`](AdapterContext.md#ir)
