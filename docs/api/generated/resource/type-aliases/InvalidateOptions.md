[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / InvalidateOptions

# Type Alias: InvalidateOptions

```ts
type InvalidateOptions = object;
```

Options for invalidate function

## Properties

### storeKey?

```ts
optional storeKey: string;
```

Store key to target (e.g., 'my-plugin/thing')
If not provided, invalidates across all registered stores

---

### emitEvent?

```ts
optional emitEvent: boolean;
```

Whether to emit the cache.invalidated event

#### Default

```ts
true;
```
