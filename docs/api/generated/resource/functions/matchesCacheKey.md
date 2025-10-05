[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / matchesCacheKey

# Function: matchesCacheKey()

```ts
function matchesCacheKey(key, pattern): boolean;
```

Defined in: [resource/cache.ts:297](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L297)

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
