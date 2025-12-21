[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / CacheKeyFn

# Type Alias: CacheKeyFn&lt;TParams&gt;

```ts
type CacheKeyFn&lt;TParams&gt; = (params?) =&gt; (string | number | boolean | null | undefined)[];
```

Cache key generator function

Generates a unique key for caching resource data in the store.
Keys should be deterministic based on query parameters.

## Type Parameters

### TParams

`TParams` = `unknown`

## Parameters

### params?

`TParams`

Query parameters or identifier

## Returns

(`string` \| `number` \| `boolean` \| `null` \| `undefined`)[]

Array of cache key segments

## Example

```ts
(params) =&gt; ['thing', 'list', params?.q, params?.cursor]
(id) =&gt; ['thing', 'get', id]
```
