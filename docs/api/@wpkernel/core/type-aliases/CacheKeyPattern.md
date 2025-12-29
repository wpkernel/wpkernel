[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / CacheKeyPattern

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
