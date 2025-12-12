[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / AdapterExtensionFactory

# Type Alias: AdapterExtensionFactory<TConfigSurface, TIr>

```ts
type AdapterExtensionFactory<TConfigSurface, TIr> = (context) =>
  | AdapterExtension
  | AdapterExtension[]
  | void;
```

Factory responsible for returning adapter extensions.

## Type Parameters

### TConfigSurface

`TConfigSurface` = `unknown`

### TIr

`TIr` = `unknown`

## Parameters

### context

[`AdapterContext`](../interfaces/AdapterContext.md)<`TConfigSurface`, `TIr`>

## Returns

\| [`AdapterExtension`](../interfaces/AdapterExtension.md)
\| [`AdapterExtension`](../interfaces/AdapterExtension.md)[]
\| `void`
