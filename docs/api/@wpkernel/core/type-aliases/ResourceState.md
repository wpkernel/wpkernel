[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceState

# Type Alias: ResourceState<T>

```ts
type ResourceState<T> = object;
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
errors: Record & lt;
(string, string & gt);
```

Error messages by cache key.

---

### items

```ts
items: Record & lt;
(string | number, T & gt);
```

Map of items by ID.

---

### listMeta

```ts
listMeta: Record<
	string,
	{
		hasMore?: boolean;
		nextCursor?: string;
		status?: ResourceListStatus;
		total?: number;
	}
>;
```

List metadata (total count, pagination, etc).

---

### lists

```ts
lists: Record<string, (string | number)[]>;
```

List queries and their results.
Key is stringified query params, value is array of IDs.
