[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceObject

# Type Alias: ResourceObject\<T, TQuery\>

```ts
type ResourceObject<T, TQuery> = object & ResourceClient<T, TQuery>;
```

Complete resource object returned by defineResource

Combines client methods, store key, cache key generators, and metadata.
Provides both thin-flat API (direct methods) and grouped API (namespaces).

## Type Declaration

### name

```ts
name: string;
```

Resource name

### storeKey

```ts
storeKey: string;
```

WordPress data store key (e.g., 'my-plugin/thing')

Used for store registration and selectors

### store

```ts
readonly store: unknown;
```

Lazy-loaded @wordpress/data store

Automatically registered on first access.
Returns the store descriptor compatible with select/dispatch.

#### Example

```ts
import { select } from '@wordpress/data';
const item = select(thing.store).getItem(123);
```

### cacheKeys

```ts
cacheKeys: Required<CacheKeys>;
```

Cache key generators for all operations

Use these to generate cache keys for invalidation

### routes

```ts
routes: ResourceRoutes;
```

REST route definitions (normalized)

### useGet()?

```ts
optional useGet: (id) => object;
```

React hook to fetch a single item

Uses @wordpress/data's useSelect under the hood.
Automatically handles loading states and re-fetching.
Requires the `@geekist/wp-kernel-ui` package to register hooks.

#### Parameters

##### id

Item identifier

`string` | `number`

#### Returns

`object`

Hook result with data, isLoading, error

##### data

```ts
data: T | undefined;
```

##### isLoading

```ts
isLoading: boolean;
```

##### error

```ts
error: string | undefined;
```

#### Example

```ts
function ThingView({ id }: { id: number }) {
  const { data: thing, isLoading } = thing.useGet(id);
  if (isLoading) return <Spinner />;
  return <div>{thing.title}</div>;
}
```

### useList()?

```ts
optional useList: (query?) => object;
```

React hook to fetch a list of items

Uses @wordpress/data's useSelect under the hood.
Automatically handles loading states and re-fetching.
Requires the `@geekist/wp-kernel-ui` package to register hooks.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`object`

Hook result with data, isLoading, error

##### data

```ts
data: ListResponse<T> | undefined;
```

##### isLoading

```ts
isLoading: boolean;
```

##### error

```ts
error: string | undefined;
```

#### Example

```ts
function ThingList({ status }: { status: string }) {
  const { data, isLoading } = thing.useList({ status });
  if (isLoading) return <Spinner />;
  return <List items={data?.items} />;
}
```

### prefetchGet()?

```ts
optional prefetchGet: (id) => Promise<void>;
```

Prefetch a single item into the cache

Useful for optimistic loading or preloading data before navigation.
Does not return the data, only ensures it's in the cache.

#### Parameters

##### id

Item identifier

`string` | `number`

#### Returns

`Promise`\<`void`\>

Promise resolving when prefetch completes

#### Example

```ts
// Prefetch on hover
<Link onMouseEnter={() => thing.prefetchGet(123)}>
  View Thing
</Link>
```

### prefetchList()?

```ts
optional prefetchList: (query?) => Promise<void>;
```

Prefetch a list of items into the cache

Useful for optimistic loading or preloading data before navigation.
Does not return the data, only ensures it's in the cache.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Promise`\<`void`\>

Promise resolving when prefetch completes

#### Example

```ts
// Prefetch on app mount
useEffect(() => {
	thing.prefetchList({ status: 'active' });
}, []);
```

### invalidate()

```ts
invalidate: (patterns) => void;
```

Invalidate cached data for this resource

Instance method alternative to global `invalidate()` function.
Automatically scoped to this resource's store.

#### Parameters

##### patterns

Cache key patterns to invalidate

[`CacheKeyPattern`](CacheKeyPattern.md) | [`CacheKeyPattern`](CacheKeyPattern.md)[]

#### Returns

`void`

#### Example

```ts
// After creating a thing
await thing.create(data);
thing.invalidate([['thing', 'list']]); // Invalidate all lists

// After updating
await thing.update(id, data);
thing.invalidate([['thing', 'get', id]]); // Invalidate specific item
thing.invalidate([['thing', 'list']]); // Also invalidate lists
```

### key()

```ts
key: (operation, params?) => (string | number | boolean)[];
```

Generate a cache key for this resource

Useful for manual cache management or debugging.

#### Parameters

##### operation

Operation name ('list', 'get', etc.)

`"list"` | `"get"` | `"create"` | `"update"` | `"remove"`

##### params?

Parameters for the operation

`TQuery` | `string` | `number` | `Partial`\<`T`\>

#### Returns

(`string` \| `number` \| `boolean`)[]

Cache key array

#### Example

```ts
const key = thing.key('list', { status: 'active' });
// => ['thing', 'list', '{"status":"active"}']

const key2 = thing.key('get', 123);
// => ['thing', 'get', 123]
```

### select?

```ts
optional select: object;
```

Grouped API: Pure selectors (no fetching)

Access cached data without triggering network requests.
Ideal for computed values and derived state.

#### select.item()

```ts
item: (id) => T | undefined;
```

Get cached item by ID (no fetch)

##### Parameters

###### id

Item identifier

`string` | `number`

##### Returns

`T` \| `undefined`

Cached item or undefined

#### select.items()

```ts
items: () => T[];
```

Get all cached items (no fetch)

##### Returns

`T`[]

Array of all cached items

#### select.list()

```ts
list: (query?) => T[];
```

Get cached list by query (no fetch)

##### Parameters

###### query?

`TQuery`

Query parameters

##### Returns

`T`[]

Array of items matching query or empty array

### use?

```ts
optional use: object;
```

Grouped API: React hooks

Convenience wrappers around useGet/useList for the grouped API.

#### use.item()

```ts
item: (id) => object;
```

React hook to fetch and watch a single item

##### Parameters

###### id

`string` | `number`

##### Returns

`object`

###### data

```ts
data: T | undefined;
```

###### isLoading

```ts
isLoading: boolean;
```

###### error

```ts
error: string | undefined;
```

#### use.list()

```ts
list: (query?) => object;
```

React hook to fetch and watch a list

##### Parameters

###### query?

`TQuery`

##### Returns

`object`

###### data

```ts
data: ListResponse<T> | undefined;
```

###### isLoading

```ts
isLoading: boolean;
```

###### error

```ts
error: string | undefined;
```

### get?

```ts
optional get: object;
```

Grouped API: Explicit data fetching (bypass cache)

Direct network calls that always hit the server.
Useful for refresh actions or real-time data requirements.

#### get.item()

```ts
item: (id) => Promise<T>;
```

Get item from server (bypass cache)

Always fetches fresh data from the server, ignoring cache.
Use for explicit refresh actions or real-time requirements.

##### Parameters

###### id

Item identifier

`string` | `number`

##### Returns

`Promise`\<`T`\>

Promise resolving to the item

#### get.list()

```ts
list: (query?) => Promise<ListResponse<T>>;
```

Get list from server (bypass cache)

Always fetches fresh data from the server, ignoring cache.
Use for explicit refresh actions or real-time requirements.

##### Parameters

###### query?

`TQuery`

Optional query parameters

##### Returns

`Promise`\<[`ListResponse`](ListResponse.md)\<`T`\>\>

Promise resolving to list response

### mutate?

```ts
optional mutate: object;
```

Grouped API: Mutations (CRUD operations)

Write operations that modify server state.

#### mutate.create()

```ts
create: (data) => Promise<T>;
```

Create new item

##### Parameters

###### data

`Partial`\<`T`\>

##### Returns

`Promise`\<`T`\>

#### mutate.update()

```ts
update: (id, data) => Promise<T>;
```

Update existing item

##### Parameters

###### id

`string` | `number`

###### data

`Partial`\<`T`\>

##### Returns

`Promise`\<`T`\>

#### mutate.remove()

```ts
remove: (id) => Promise<void>;
```

Delete item

##### Parameters

###### id

`string` | `number`

##### Returns

`Promise`\<`void`\>

### cache

```ts
cache: object;
```

Grouped API: Cache control

Fine-grained cache management operations.

#### cache.prefetch

```ts
prefetch: object;
```

Prefetch operations (eager loading)

#### cache.prefetch.item()

```ts
item: (id) => Promise<void>;
```

Prefetch single item into cache

##### Parameters

###### id

`string` | `number`

##### Returns

`Promise`\<`void`\>

#### cache.prefetch.list()

```ts
list: (query?) => Promise<void>;
```

Prefetch list into cache

##### Parameters

###### query?

`TQuery`

##### Returns

`Promise`\<`void`\>

#### cache.invalidate

```ts
invalidate: object;
```

Cache invalidation operations

#### cache.invalidate.item()

```ts
item: (id) => void;
```

Invalidate cached item by ID

##### Parameters

###### id

`string` | `number`

##### Returns

`void`

#### cache.invalidate.list()

```ts
list: (query?) => void;
```

Invalidate cached list by query

##### Parameters

###### query?

`TQuery`

##### Returns

`void`

#### cache.invalidate.all()

```ts
all: () => void;
```

Invalidate all cached data for this resource

##### Returns

`void`

#### cache.key()

```ts
key: (operation, params?) => (string | number | boolean)[];
```

Generate cache key

##### Parameters

###### operation

`"list"` | `"get"` | `"create"` | `"update"` | `"remove"`

###### params?

`TQuery` | `string` | `number` | `Partial`\<`T`\>

##### Returns

(`string` \| `number` \| `boolean`)[]

### storeApi

```ts
storeApi: object;
```

Grouped API: Store access

Direct access to @wordpress/data store internals.

#### storeApi.key

```ts
key: string;
```

Store key for @wordpress/data

#### storeApi.descriptor

```ts
descriptor: unknown;
```

Store descriptor (lazy-loaded)

### events?

```ts
optional events: object;
```

Grouped API: Event names

Canonical event names for this resource.

#### events.created

```ts
created: string;
```

Fired when item is created

#### events.updated

```ts
updated: string;
```

Fired when item is updated

#### events.removed

```ts
removed: string;
```

Fired when item is removed

## Type Parameters

### T

`T` = `unknown`

The resource entity type

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({ ... });

// Use client methods (thin-flat API)
const items = await thing.fetchList({ q: 'search' });
const item = await thing.fetch(123);

// Use React hooks
const { data, isLoading } = thing.useGet(123);
const { data: items } = thing.useList({ q: 'search' });

// Prefetch data
await thing.prefetchGet(123);
await thing.prefetchList({ q: 'search' });

// Instance-based invalidation (include resource name as first segment)
thing.invalidate(['thing', 'list']); // Invalidate all lists
thing.invalidate(['thing', 'list', 'active']); // Invalidate specific query

// Generate cache keys
const key = thing.key('list', { q: 'search' });

// Use in store selectors
const storeKey = thing.storeKey; // 'my-plugin/thing'

// Access @wordpress/data store (lazy-loaded, auto-registered)
const store = thing.store;
const item = select(store).getItem(123);
```
