[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / invalidateAll

# Function: invalidateAll()

```ts
function invalidateAll(storeKey): void;
```

Invalidate all caches in a specific store

## Parameters

### storeKey

`string`

The store key to invalidate (e.g., 'my-plugin/thing')

## Returns

`void`

## Example

```ts
// Clear all cached data for 'thing' resource
invalidateAll('my-plugin/thing');
```
