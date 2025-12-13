[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / AdapterContext

# Interface: AdapterContext<TConfigSurface, TIr>

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

---

### namespace

```ts
namespace: string;
```

---

### reporter

```ts
reporter: Reporter;
```

---

### ir?

```ts
optional ir: TIr;
```
