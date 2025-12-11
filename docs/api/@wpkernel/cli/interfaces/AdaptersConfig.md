[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / AdaptersConfig

# Interface: AdaptersConfig<TConfigSurface, TIr>

Optional adapters configured by a wpk project.

## Type Parameters

### TConfigSurface

`TConfigSurface` = `unknown`

### TIr

`TIr` = `unknown`

## Properties

### extensions?

```ts
optional extensions: AdapterExtensionFactory<TConfigSurface, TIr>[];
```

Adapter extension factories that run during generation to patch or extend
the default adapters.

---

### php?

```ts
optional php: PhpAdapterFactory<TConfigSurface, TIr>;
```

Factory that returns PHP codegen overrides (for example, changing
namespaces or adding extra includes). Most plugins do not need this.
