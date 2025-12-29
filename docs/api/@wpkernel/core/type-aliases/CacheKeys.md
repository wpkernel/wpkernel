[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / CacheKeys

# Type Alias: CacheKeys<TListParams>

```ts
type CacheKeys<TListParams> = object;
```

Cache key generators for all CRUD operations

## Example

```ts
{
  list: (q) => ['thing', 'list', q?.search, q?.page],
  get: (id) => ['thing', 'get', id]
}
```

## Type Parameters

### TListParams

`TListParams` = `unknown`

## Properties

### create?

```ts
optional create: CacheKeyFn<unknown>;
```

Cache key for create operations (typically not cached)

---

### get?

```ts
optional get: CacheKeyFn<string | number>;
```

Cache key for single-item fetch

---

### list?

```ts
optional list: CacheKeyFn<TListParams>;
```

Cache key for list operations

---

### remove?

```ts
optional remove: CacheKeyFn<string | number>;
```

Cache key for delete operations

---

### update?

```ts
optional update: CacheKeyFn<string | number>;
```

Cache key for update operations
