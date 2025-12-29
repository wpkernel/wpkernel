[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / PhpAdapterConfig

# Interface: PhpAdapterConfig<TConfigSurface, TIr>

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

---

### codemods?

```ts
optional codemods: PhpCodemodAdapterConfig;
```

---

### customise()?

```ts
optional customise: (builder, context) => void;
```

#### Parameters

##### builder

`PhpAstBuilder`

##### context

[`AdapterExtensionContext`](AdapterExtensionContext.md)<`TConfigSurface`, `TIr`>

#### Returns

`void`

---

### driver?

```ts
optional driver: PhpDriverConfigurationOptions;
```

---

### namespace?

```ts
optional namespace: string;
```
