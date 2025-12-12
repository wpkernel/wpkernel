[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / PhpAdapterFactory

# Type Alias: PhpAdapterFactory&lt;TConfigSurface, TIr&gt;

```ts
type PhpAdapterFactory&lt;TConfigSurface, TIr&gt; = (context) =&gt; 
  | PhpAdapterConfig&lt;TConfigSurface, TIr&gt;
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

[`AdapterContext`](../interfaces/AdapterContext.md)&lt;`TConfigSurface`, `TIr`&gt;

## Returns

  \| [`PhpAdapterConfig`](../interfaces/PhpAdapterConfig.md)&lt;`TConfigSurface`, `TIr`&gt;
  \| `void`
