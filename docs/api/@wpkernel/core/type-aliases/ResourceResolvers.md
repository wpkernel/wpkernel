[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceResolvers

# Type Alias: ResourceResolvers<\_T, TQuery>

```ts
type ResourceResolvers<_T, TQuery> = object & Record<string, AnyFn>;
```

Resolvers for a resource store.

## Type Declaration

### getItem()

```ts
getItem: (id) => Generator<unknown, void, unknown>;
```

Resolver for getItem selector.
Fetches a single item by ID if not already in state.

#### Parameters

##### id

Item ID

`string` | `number`

#### Returns

`Generator`<`unknown`, `void`, `unknown`>

### getItems()

```ts
getItems: (query?) => Generator<unknown, void, unknown>;
```

Resolver for getItems selector.
Fetches a list of items if not already in state.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Generator`<`unknown`, `void`, `unknown`>

### getList()

```ts
getList: (query?) => Generator<unknown, void, unknown>;
```

Resolver for getList selector.
Same as getItems but includes metadata.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Generator`<`unknown`, `void`, `unknown`>

## Type Parameters

### \_T

`_T`

The resource entity type (unused, for type inference in store creation)

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations
