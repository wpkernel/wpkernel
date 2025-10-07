[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / invalidate

# Function: invalidate()

```ts
function invalidate(patterns, options): void;
```

Invalidate cached data matching the given patterns.
Deletes matching cache entries and marks selectors as stale.

This is the primary cache invalidation API used by Actions to ensure
UI reflects updated data after write operations.

## Parameters

### patterns

Cache key patterns to invalidate

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

### options

[`InvalidateOptions`](../type-aliases/InvalidateOptions.md) = `{}`

Invalidation options

## Returns

`void`

## Example

```ts
// Invalidate all list queries for 'thing' resource
invalidate(['thing', 'list']);

// Invalidate specific query
invalidate(['thing', 'list', 'active']);

// Invalidate across multiple resources
invalidate([
	['thing', 'list'],
	['job', 'list'],
]);

// Target specific store
invalidate(['thing', 'list'], { storeKey: 'my-plugin/thing' });
```
