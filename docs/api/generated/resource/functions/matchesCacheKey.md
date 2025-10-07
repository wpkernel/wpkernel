[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / matchesCacheKey

# Function: matchesCacheKey()

```ts
function matchesCacheKey(key, pattern): boolean;
```

Check if a cache key matches a pattern.
Supports prefix matching: pattern ['thing', 'list'] matches keys starting with 'thing:list'.

## Parameters

### key

`string`

The cache key to test (already normalized string)

### pattern

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)

The pattern to match against

## Returns

`boolean`

True if the key matches the pattern

## Example

```ts
matchesCacheKey('thing:list', ['thing', 'list']); // → true
matchesCacheKey('thing:list:active', ['thing', 'list']); // → true (prefix match)
matchesCacheKey('thing:list:active:1', ['thing', 'list']); // → true (prefix match)
matchesCacheKey('thing:get:123', ['thing', 'list']); // → false
matchesCacheKey('thing:list', ['thing', 'list', 'active']); // → false
```
