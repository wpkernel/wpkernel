[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / normalizeCacheKey

# Function: normalizeCacheKey()

```ts
function normalizeCacheKey(pattern): string;
```

Defined in: [resource/cache.ts:274](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L274)

Normalize a cache key pattern to a string representation.
Filters out null/undefined values and joins with colons.

## Parameters

### pattern

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)

Cache key pattern array

## Returns

`string`

Normalized string key

## Example

```ts
normalizeCacheKey(['thing', 'list']); // → 'thing:list'
normalizeCacheKey(['thing', 'list', null, 1]); // → 'thing:list:1'
normalizeCacheKey(['thing', 'get', 123]); // → 'thing:get:123'
```
