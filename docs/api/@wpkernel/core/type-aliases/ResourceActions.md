[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceActions

# Type Alias: ResourceActions&lt;T&gt;

```ts
type ResourceActions&lt;T&gt; = object & Record&lt;string, AnyFn&gt;;
```

Actions for a resource store.

## Type Declaration

### invalidate()

```ts
invalidate: (cacheKeys) =&gt; void;
```

Clear cached data for specific cache keys.

#### Parameters

##### cacheKeys

`string`[]

Array of cache keys to invalidate

#### Returns

`void`

### invalidateAll()

```ts
invalidateAll: () =&gt; void;
```

Clear all cached data for this resource.

#### Returns

`void`

### receiveError()

```ts
receiveError: (cacheKey, error) =&gt; void;
```

Store an error for a given cache key.

#### Parameters

##### cacheKey

`string`

The cache key that failed

##### error

`string`

Error message

#### Returns

`void`

### receiveItem()

```ts
receiveItem: (item) =&gt; void;
```

Receive a single item.

#### Parameters

##### item

`T`

The item to store

#### Returns

`void`

### receiveItems()

```ts
receiveItems: (queryKey, items, meta?) =&gt; void;
```

Receive multiple items from a list query.

#### Parameters

##### queryKey

`string`

Stringified query parameters

##### items

`T`[]

Array of items

##### meta?

List metadata (total, hasMore, nextCursor)

###### hasMore?

`boolean`

###### nextCursor?

`string`

###### status?

[`ResourceListStatus`](ResourceListStatus.md)

###### total?

`number`

#### Returns

`void`

### setListStatus()

```ts
setListStatus: (queryKey, status) =&gt; void;
```

Update the status of a list query.

#### Parameters

##### queryKey

`string`

Stringified query parameters

##### status

[`ResourceListStatus`](ResourceListStatus.md)

Loading status

#### Returns

`void`

## Type Parameters

### T

`T`

The resource entity type
