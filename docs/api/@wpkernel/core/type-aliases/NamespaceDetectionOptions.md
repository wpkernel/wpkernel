[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / NamespaceDetectionOptions

# Type Alias: NamespaceDetectionOptions

```ts
type NamespaceDetectionOptions = object;
```

Options for namespace detection

## Properties

### explicit?

```ts
optional explicit: string;
```

Explicit namespace override

***

### fallback?

```ts
optional fallback: string;
```

Fallback namespace if detection fails

#### Default

```ts
'wpk'
```

***

### mode?

```ts
optional mode: NamespaceDetectionMode;
```

Detection mode - controls which methods are used

#### Default

```ts
'wp'
```

***

### moduleId?

```ts
optional moduleId: string;
```

Module ID for Script Modules (e.g., 'wpk/my-plugin' → 'my-plugin')

***

### runtime?

```ts
optional runtime: NamespaceRuntimeContext;
```

Runtime context - affects availability of detection methods

#### Default

```ts
'auto' (detected)
```

***

### validate?

```ts
optional validate: boolean;
```

Whether to validate the detected namespace

#### Default

```ts
true
```
