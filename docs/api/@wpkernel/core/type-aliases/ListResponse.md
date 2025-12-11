[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / ListResponse

# Type Alias: ListResponse&lt;T&gt;

```ts
type ListResponse&lt;T&gt; = object;
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

***

### hasMore?

```ts
optional hasMore: boolean;
```

Whether there are more pages

***

### nextCursor?

```ts
optional nextCursor: string;
```

Pagination cursor for next page

***

### total?

```ts
optional total: number;
```

Total count of items (if available)
