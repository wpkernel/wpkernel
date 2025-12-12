[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PhpAdapterFactory

# Type Alias: PhpAdapterFactory<TConfigSurface, TIr>

```ts
type PhpAdapterFactory<TConfigSurface, TIr> = (context) =>
  | PhpAdapterConfig<TConfigSurface, TIr>
  | void;
```

Factory for producing PHP adapter configuration.

## Type Parameters

### TConfigSurface

`TConfigSurface` = `unknown`

### TIr

`TIr` = `unknown`

## Parameters

### context

[`AdapterContext`](../interfaces/AdapterContext.md)<`TConfigSurface`, `TIr`>

## Returns

\| [`PhpAdapterConfig`](../interfaces/PhpAdapterConfig.md)<`TConfigSurface`, `TIr`>
\| `void`
