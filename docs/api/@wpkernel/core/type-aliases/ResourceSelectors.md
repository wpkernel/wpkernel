[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceSelectors

# Type Alias: ResourceSelectors&lt;T, TQuery&gt;

```ts
type ResourceSelectors&lt;T, TQuery&gt; = object;
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
getError: (state, cacheKey) =&gt; string | undefined;
```

Get error for a cache key.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

Store state

##### cacheKey

`string`

The cache key

#### Returns

`string` \| `undefined`

Error message or undefined

***

### getItem()

```ts
getItem: (state, id) =&gt; T | undefined;
```

Get a single item by ID.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

Store state

##### id

Item ID

`string` | `number`

#### Returns

`T` \| `undefined`

The item or undefined if not found

***

### getItems()

```ts
getItems: (state, query?) =&gt; T[];
```

Get items from a list query.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

Store state

##### query?

`TQuery`

Query parameters

#### Returns

`T`[]

Array of items

***

### getList()

```ts
getList: (state, query?) =&gt; ListResponse&lt;T&gt;;
```

Get list response with metadata.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

Store state

##### query?

`TQuery`

Query parameters

#### Returns

[`ListResponse`](ListResponse.md)&lt;`T`&gt;

List response with items and metadata

***

### getListError()

```ts
getListError: (state, query?) =&gt; string | undefined;
```

Get the error message for a list query, if any.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

Store state

##### query?

`TQuery`

Query parameters

#### Returns

`string` \| `undefined`

Error message or undefined

***

### getListStatus()

```ts
getListStatus: (state, query?) =&gt; ResourceListStatus;
```

Get the status for a list query.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

Store state

##### query?

`TQuery`

Query parameters

#### Returns

[`ResourceListStatus`](ResourceListStatus.md)

List status

***

### hasFinishedResolution()

```ts
hasFinishedResolution: (state, selectorName, args?) =&gt; boolean;
```

Check if a selector has finished resolution.

Note: This is provided by @wordpress/data's resolution system.
We include it here for type completeness.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

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

***

### hasStartedResolution()

```ts
hasStartedResolution: (state, selectorName, args?) =&gt; boolean;
```

Check if a selector has started resolution.

Note: This is provided by @wordpress/data's resolution system.
We include it here for type completeness.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

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

***

### isResolving()

```ts
isResolving: (state, selectorName, args?) =&gt; boolean;
```

Check if a selector is currently resolving.

Note: This is provided by @wordpress/data's resolution system.
We include it here for type completeness.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

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
