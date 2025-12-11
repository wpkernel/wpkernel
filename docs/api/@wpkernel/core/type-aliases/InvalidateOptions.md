[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / InvalidateOptions

# Type Alias: InvalidateOptions

```ts
type InvalidateOptions = object;
```

Options for invalidate function

## Properties

### emitEvent?

```ts
optional emitEvent: boolean;
```

Whether to emit the cache.invalidated event

#### Default

```ts
true
```

***

### namespace?

```ts
optional namespace: string;
```

Optional namespace for logging context.

***

### registry?

```ts
optional registry: WPKernelRegistry;
```

Registry to operate against instead of relying on global getWPData().

***

### reporter?

```ts
optional reporter: Reporter;
```

Reporter override for cache instrumentation.

***

### resourceName?

```ts
optional resourceName: string;
```

Optional resource name for logging context.

***

### storeKey?

```ts
optional storeKey: string;
```

Store key to target (e.g., 'my-plugin/thing')
If not provided, invalidates across all registered stores
