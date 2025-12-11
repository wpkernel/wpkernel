[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / AdapterExtensionFactory

# Type Alias: AdapterExtensionFactory&lt;TConfigSurface, TIr&gt;

```ts
type AdapterExtensionFactory&lt;TConfigSurface, TIr&gt; = (context) =&gt; 
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

[`AdapterContext`](../interfaces/AdapterContext.md)&lt;`TConfigSurface`, `TIr`&gt;

## Returns

  \| [`AdapterExtension`](../interfaces/AdapterExtension.md)
  \| [`AdapterExtension`](../interfaces/AdapterExtension.md)[]
  \| `void`
