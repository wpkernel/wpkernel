[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / AdapterContext

# Interface: AdapterContext&lt;TConfigSurface, TIr&gt;

Context shared with adapter factories while generating artifacts.

## Extended by

- [`AdapterExtensionContext`](AdapterExtensionContext.md)

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

***

### namespace

```ts
namespace: string;
```

***

### reporter

```ts
reporter: Reporter;
```

***

### ir?

```ts
optional ir: TIr;
```
