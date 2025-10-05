[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / findMatchingKeys

# Function: findMatchingKeys()

```ts
function findMatchingKeys(keys, pattern): string[];
```

Defined in: [resource/cache.ts:332](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L332)

Find all cache keys in a collection that match the given pattern.

## Parameters

### keys

`string`[]

Collection of cache keys (typically from store state)

### pattern

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)

Pattern to match against

## Returns

`string`[]

Array of matching cache keys

## Example

```ts
const keys = ['thing:list:active', 'thing:list:inactive', 'thing:get:123'];
findMatchingKeys(keys, ['thing', 'list']); // → ['thing:list:active', 'thing:list:inactive']
findMatchingKeys(keys, ['thing', 'get']); // → ['thing:get:123']
```
