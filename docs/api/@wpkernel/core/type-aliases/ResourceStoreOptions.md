[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceStoreOptions

# Type Alias: ResourceStoreOptions&lt;T, TQuery&gt;

```ts
type ResourceStoreOptions&lt;T, TQuery&gt; = object;
```

Complete resource definition configuration

## Example

```ts
const thing = defineResource&lt;Thing, { q?: string }&gt;({
  name: 'thing',
  routes: {
    list: { path: '/my-plugin/v1/things', method: 'GET' },
    get: { path: '/my-plugin/v1/things/:id', method: 'GET' }
  },
  cacheKeys: {
    list: (q) =&gt; ['thing', 'list', q?.q],
    get: (id) =&gt; ['thing', 'get', id]
  },
  schema: import('./thing.schema.json')
})
```

## Type Parameters

### T

`T`

The resource entity type (e.g., Thing)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { q?: string })

## Properties

### getId()?

```ts
optional getId: (item) =&gt; string | number;
```

Function to extract ID from an item.
Defaults to (item) =&gt; item.id

#### Parameters

##### item

`T`

#### Returns

`string` \| `number`

***

### getQueryKey()?

```ts
optional getQueryKey: (query?) =&gt; string;
```

Function to generate query key from query params.
Defaults to JSON.stringify

#### Parameters

##### query?

`TQuery`

#### Returns

`string`

***

### initialState?

```ts
optional initialState: Partial&lt;ResourceState&lt;T&gt;&gt;;
```

Initial state overrides for the store.
