[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / AdapterExtensionContext

# Interface: AdapterExtensionContext&lt;TConfigSurface, TIr&gt;

Execution context provided to adapter extensions.

## Extends

- [`AdapterContext`](AdapterContext.md)&lt;`TConfigSurface`, `TIr`&gt;

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

***

### formatPhp()

```ts
formatPhp: (filePath, contents) =&gt; Promise&lt;string&gt;;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`&lt;`string`&gt;

***

### formatTs()

```ts
formatTs: (filePath, contents) =&gt; Promise&lt;string&gt;;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`&lt;`string`&gt;

***

### namespace

```ts
namespace: string;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`namespace`](AdapterContext.md#namespace)

***

### outputDir

```ts
outputDir: string;
```

***

### queueFile()

```ts
queueFile: (filePath, contents) =&gt; Promise&lt;void&gt;;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`&lt;`void`&gt;

***

### reporter

```ts
reporter: Reporter;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`reporter`](AdapterContext.md#reporter)

***

### tempDir

```ts
tempDir: string;
```

***

### updateIr()

```ts
updateIr: (ir) =&gt; void;
```

#### Parameters

##### ir

`TIr`

#### Returns

`void`

***

### configDirectory?

```ts
optional configDirectory: string;
```

***

### ir?

```ts
optional ir: TIr;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`ir`](AdapterContext.md#ir)
