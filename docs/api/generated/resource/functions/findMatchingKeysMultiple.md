[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / findMatchingKeysMultiple

# Function: findMatchingKeysMultiple()

```ts
function findMatchingKeysMultiple(keys, patterns): string[];
```

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
