[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / CacheKeyPattern

# Type Alias: CacheKeyPattern

```ts
type CacheKeyPattern = (string | number | boolean | null | undefined)[];
```

Defined in: [resource/cache.ts:258](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L258)

Cache key pattern - array of primitives (strings, numbers, booleans)
Null and undefined values are filtered out during normalization.

## Example

```ts
['thing', 'list'][('thing', 'list', 'active')][('thing', 'get', 123)]; // Matches all 'thing' lists // Matches lists filtered by 'active' // Matches get query for item 123
```
