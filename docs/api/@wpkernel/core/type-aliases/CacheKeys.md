[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / CacheKeys

# Type Alias: CacheKeys&lt;TListParams&gt;

```ts
type CacheKeys&lt;TListParams&gt; = object;
```

Cache key generators for all CRUD operations

## Example

```ts
{
  list: (q) =&gt; ['thing', 'list', q?.search, q?.page],
  get: (id) =&gt; ['thing', 'get', id]
}
```

## Type Parameters

### TListParams

`TListParams` = `unknown`

## Properties

### create?

```ts
optional create: CacheKeyFn&lt;unknown&gt;;
```

Cache key for create operations (typically not cached)

***

### get?

```ts
optional get: CacheKeyFn&lt;string | number&gt;;
```

Cache key for single-item fetch

***

### list?

```ts
optional list: CacheKeyFn&lt;TListParams&gt;;
```

Cache key for list operations

***

### remove?

```ts
optional remove: CacheKeyFn&lt;string | number&gt;;
```

Cache key for delete operations

***

### update?

```ts
optional update: CacheKeyFn&lt;string | number&gt;;
```

Cache key for update operations
