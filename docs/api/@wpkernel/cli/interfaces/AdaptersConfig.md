[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / AdaptersConfig

# Interface: AdaptersConfig&lt;TConfigSurface, TIr&gt;

Optional adapters configured by a wpk project.

## Type Parameters

### TConfigSurface

`TConfigSurface` = `unknown`

### TIr

`TIr` = `unknown`

## Properties

### extensions?

```ts
optional extensions: AdapterExtensionFactory&lt;TConfigSurface, TIr&gt;[];
```

Adapter extension factories that run during generation to patch or extend
the default adapters.

***

### php?

```ts
optional php: PhpAdapterFactory&lt;TConfigSurface, TIr&gt;;
```

Factory that returns PHP codegen overrides (for example, changing
namespaces or adding extra includes). Most plugins do not need this.
