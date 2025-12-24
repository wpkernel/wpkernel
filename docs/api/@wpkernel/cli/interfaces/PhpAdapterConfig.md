[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

***

[@wpkernel/cli](../README.md) / PhpAdapterConfig

# Interface: PhpAdapterConfig&lt;TConfigSurface, TIr&gt;

Configuration returned by the PHP adapter factory.

## Type Parameters

### TConfigSurface

`TConfigSurface` = `unknown`

### TIr

`TIr` = `unknown`

## Properties

### autoload?

```ts
optional autoload: string;
```

***

### codemods?

```ts
optional codemods: PhpCodemodAdapterConfig;
```

***

### customise()?

```ts
optional customise: (builder, context) =&gt; void;
```

#### Parameters

##### builder

`PhpAstBuilder`

##### context

[`AdapterExtensionContext`](AdapterExtensionContext.md)&lt;`TConfigSurface`, `TIr`&gt;

#### Returns

`void`

***

### driver?

```ts
optional driver: PhpDriverConfigurationOptions;
```

***

### namespace?

```ts
optional namespace: string;
```
