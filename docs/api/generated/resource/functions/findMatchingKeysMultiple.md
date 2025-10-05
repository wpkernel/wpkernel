[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / findMatchingKeysMultiple

# Function: findMatchingKeysMultiple()

```ts
function findMatchingKeysMultiple(keys, patterns): string[];
```

Defined in: [resource/cache.ts:353](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L353)

Find all cache keys matching any of the provided patterns.

## Parameters

### keys

`string`[]

Collection of cache keys

### patterns

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

Array of patterns to match against

## Returns

`string`[]

Array of matching cache keys (deduplicated)

## Example

```ts
const keys = ['thing:list:active', 'job:list:open', 'thing:get:123'];
findMatchingKeysMultiple(keys, [
	['thing', 'list'],
	['job', 'list'],
]);
// → ['thing:list:active', 'job:list:open']
```
