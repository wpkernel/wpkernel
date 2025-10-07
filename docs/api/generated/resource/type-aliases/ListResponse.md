[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ListResponse

# Type Alias: ListResponse\<T\>

```ts
type ListResponse<T> = object;
```

List response with pagination metadata

## Type Parameters

### T

`T`

The resource entity type

## Properties

### items

```ts
items: T[];
```

Array of resource entities

---

### total?

```ts
optional total: number;
```

Total count of items (if available)

---

### nextCursor?

```ts
optional nextCursor: string;
```

Pagination cursor for next page

---

### hasMore?

```ts
optional hasMore: boolean;
```

Whether there are more pages
