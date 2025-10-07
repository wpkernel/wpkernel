[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / CacheKeyPattern

# Type Alias: CacheKeyPattern

```ts
type CacheKeyPattern = (string | number | boolean | null | undefined)[];
```

Cache key pattern - array of primitives (strings, numbers, booleans)
Null and undefined values are filtered out during normalization.

## Example

```ts
['thing', 'list'][('thing', 'list', 'active')][('thing', 'get', 123)]; // Matches all 'thing' lists // Matches lists filtered by 'active' // Matches get query for item 123
```
