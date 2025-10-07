[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / CacheKeyFn

# Type Alias: CacheKeyFn()\<TParams\>

```ts
type CacheKeyFn<TParams> = (
	params?
) => (string | number | boolean | null | undefined)[];
```

Cache key generator function

Generates a unique key for caching resource data in the store.
Keys should be deterministic based on query parameters.

## Type Parameters

### TParams

`TParams` = `unknown`

## Parameters

### params?

`TParams`

Query parameters or identifier

## Returns

(`string` \| `number` \| `boolean` \| `null` \| `undefined`)[]

Array of cache key segments

## Example

```ts
(params) => ['thing', 'list', params?.q, params?.cursor]
(id) => ['thing', 'get', id]
```
