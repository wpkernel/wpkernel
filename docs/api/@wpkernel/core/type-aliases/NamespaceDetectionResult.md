[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / NamespaceDetectionResult

# Type Alias: NamespaceDetectionResult

```ts
type NamespaceDetectionResult = object;
```

Result of namespace detection

## Properties

### namespace

```ts
namespace: string;
```

The detected/resolved namespace

***

### sanitized

```ts
sanitized: boolean;
```

Whether the namespace was sanitized

***

### source

```ts
source: 
  | "explicit"
  | "build-define"
  | "env-define"
  | "module-id"
  | "plugin-header"
  | "package-json"
  | "fallback";
```

Source of the namespace

***

### original?

```ts
optional original: string;
```

Original value before sanitization (if different)
