[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceState

# Type Alias: ResourceState&lt;T&gt;

```ts
type ResourceState&lt;T&gt; = object;
```

Normalized state shape for a resource store.

Tracks items, list mappings, list metadata, and per-key errors in a form
consumable by `@wordpress/data` selectors and resolvers.

## Type Parameters

### T

`T`

Entity shape stored in the resource.

## Properties

### errors

```ts
errors: Record&lt;string, string&gt;;
```

Error messages by cache key.

***

### items

```ts
items: Record&lt;string | number, T&gt;;
```

Map of items by ID.

***

### listMeta

```ts
listMeta: Record&lt;string, {
  hasMore?: boolean;
  nextCursor?: string;
  status?: ResourceListStatus;
  total?: number;
}&gt;;
```

List metadata (total count, pagination, etc).

***

### lists

```ts
lists: Record&lt;string, (string | number)[]&gt;;
```

List queries and their results.
Key is stringified query params, value is array of IDs.
