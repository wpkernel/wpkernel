[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceResolvers

# Type Alias: ResourceResolvers&lt;_T, TQuery&gt;

```ts
type ResourceResolvers&lt;_T, TQuery&gt; = object & Record&lt;string, AnyFn&gt;;
```

Resolvers for a resource store.

## Type Declaration

### getItem()

```ts
getItem: (id) =&gt; Generator&lt;unknown, void, unknown&gt;;
```

Resolver for getItem selector.
Fetches a single item by ID if not already in state.

#### Parameters

##### id

Item ID

`string` | `number`

#### Returns

`Generator`&lt;`unknown`, `void`, `unknown`&gt;

### getItems()

```ts
getItems: (query?) =&gt; Generator&lt;unknown, void, unknown&gt;;
```

Resolver for getItems selector.
Fetches a list of items if not already in state.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Generator`&lt;`unknown`, `void`, `unknown`&gt;

### getList()

```ts
getList: (query?) =&gt; Generator&lt;unknown, void, unknown&gt;;
```

Resolver for getList selector.
Same as getItems but includes metadata.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Generator`&lt;`unknown`, `void`, `unknown`&gt;

## Type Parameters

### _T

`_T`

The resource entity type (unused, for type inference in store creation)

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations
