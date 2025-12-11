[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceSelectors

# Type Alias: ResourceSelectors<T, TQuery>

```ts
type ResourceSelectors<T, TQuery> = object;
```

Selectors for a resource store.

## Type Parameters

### T

`T`

The resource entity type

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations

## Properties

### getError()

```ts
getError: (state, cacheKey) => string | undefined;
```

Get error for a cache key.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### cacheKey

`string`

The cache key

#### Returns

`string` \| `undefined`

Error message or undefined

---

### getItem()

```ts
getItem: (state, id) => T | undefined;
```

Get a single item by ID.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### id

Item ID

`string` | `number`

#### Returns

`T` \| `undefined`

The item or undefined if not found

---

### getItems()

```ts
getItems: (state, query?) => T[];
```

Get items from a list query.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### query?

`TQuery`

Query parameters

#### Returns

`T`[]

Array of items

---

### getList()

```ts
getList: (state, query?) => ListResponse<T>;
```

Get list response with metadata.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### query?

`TQuery`

Query parameters

#### Returns

[`ListResponse`](ListResponse.md)<`T`>

List response with items and metadata

---

### getListError()

```ts
getListError: (state, query?) => string | undefined;
```

Get the error message for a list query, if any.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### query?

`TQuery`

Query parameters

#### Returns

`string` \| `undefined`

Error message or undefined

---

### getListStatus()

```ts
getListStatus: (state, query?) => ResourceListStatus;
```

Get the status for a list query.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### query?

`TQuery`

Query parameters

#### Returns

[`ResourceListStatus`](ResourceListStatus.md)

List status

---

### hasFinishedResolution()

```ts
hasFinishedResolution: (state, selectorName, args?) => boolean;
```

Check if a selector has finished resolution.

Note: This is provided by @wordpress/data's resolution system.
We include it here for type completeness.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### selectorName

`string`

Name of the selector

##### args?

`unknown`[]

Arguments passed to the selector

#### Returns

`boolean`

True if resolution has finished

---

### hasStartedResolution()

```ts
hasStartedResolution: (state, selectorName, args?) => boolean;
```

Check if a selector has started resolution.

Note: This is provided by @wordpress/data's resolution system.
We include it here for type completeness.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### selectorName

`string`

Name of the selector

##### args?

`unknown`[]

Arguments passed to the selector

#### Returns

`boolean`

True if resolution has started

---

### isResolving()

```ts
isResolving: (state, selectorName, args?) => boolean;
```

Check if a selector is currently resolving.

Note: This is provided by @wordpress/data's resolution system.
We include it here for type completeness.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`>

Store state

##### selectorName

`string`

Name of the selector

##### args?

`unknown`[]

Arguments passed to the selector

#### Returns

`boolean`

True if resolving
