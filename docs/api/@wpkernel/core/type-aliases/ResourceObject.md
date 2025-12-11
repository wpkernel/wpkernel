[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceObject

# Type Alias: ResourceObject&lt;T, TQuery, TRoutes&gt;

```ts
type ResourceObject&lt;T, TQuery, TRoutes&gt; = object & ResourceClient&lt;T, TQuery&gt;;
```

Complete resource object returned by defineResource

Combines client methods, store key, cache key generators, and metadata.
Provides both thin-flat API (direct methods) and grouped API (namespaces).

## Type Declaration

### cache

```ts
cache: object;
```

Grouped API: Cache control

Fine-grained cache management operations.

#### cache.invalidate

```ts
invalidate: object;
```

Cache invalidation operations

#### cache.invalidate.all()

```ts
all: () =&gt; void;
```

Invalidate all cached data for this resource

##### Returns

`void`

#### cache.invalidate.item()

```ts
item: (id) =&gt; void;
```

Invalidate cached item by ID

##### Parameters

###### id

`string` | `number`

##### Returns

`void`

#### cache.invalidate.list()

```ts
list: (query?) =&gt; void;
```

Invalidate cached list by query

##### Parameters

###### query?

`TQuery`

##### Returns

`void`

#### cache.key()

```ts
key: (operation, params?) =&gt; (string | number | boolean)[];
```

Generate cache key

##### Parameters

###### operation

`"list"` | `"get"` | `"create"` | `"update"` | `"remove"`

###### params?

`TQuery` | `string` | `number` | `Partial`&lt;`T`&gt;

##### Returns

(`string` \| `number` \| `boolean`)[]

#### cache.prefetch

```ts
prefetch: object;
```

Prefetch operations (eager loading)

#### cache.prefetch.item()

```ts
item: (id) =&gt; Promise&lt;void&gt;;
```

Prefetch single item into cache

##### Parameters

###### id

`string` | `number`

##### Returns

`Promise`&lt;`void`&gt;

#### cache.prefetch.list()

```ts
list: (query?) =&gt; Promise&lt;void&gt;;
```

Prefetch list into cache

##### Parameters

###### query?

`TQuery`

##### Returns

`Promise`&lt;`void`&gt;

### cacheKeys

```ts
cacheKeys: Required&lt;CacheKeys&lt;TQuery&gt;&gt;;
```

Cache key generators for all operations

Use these to generate cache keys for invalidation

### invalidate()

```ts
invalidate: (patterns) =&gt; void;
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
key: (operation, params?) =&gt; (string | number | boolean)[];
```

Generate a cache key for this resource

Useful for manual cache management or debugging.

#### Parameters

##### operation

Operation name ('list', 'get', etc.)

`"list"` | `"get"` | `"create"` | `"update"` | `"remove"`

##### params?

Parameters for the operation

`TQuery` | `string` | `number` | `Partial`&lt;`T`&gt;

#### Returns

(`string` \| `number` \| `boolean`)[]

Cache key array

#### Example

```ts
const key = thing.key('list', { status: 'active' });
// =&gt; ['thing', 'list', '{"status":"active"}']

const key2 = thing.key('get', 123);
// =&gt; ['thing', 'get', 123]
```

### name

```ts
name: string;
```

Resource name

### reporter

```ts
reporter: Reporter;
```

Reporter instance used for resource instrumentation.

### routes

```ts
routes: TRoutes;
```

REST route definitions (normalized)

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

### storeApi

```ts
storeApi: object;
```

Grouped API: Store access

Direct access to @wordpress/data store internals.

#### storeApi.descriptor

```ts
descriptor: unknown;
```

Store descriptor (lazy-loaded)

#### storeApi.key

```ts
key: string;
```

Store key for @wordpress/data

### storeKey

```ts
storeKey: string;
```

WordPress data store key (e.g., 'my-plugin/thing')

Used for store registration and selectors

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

#### events.removed

```ts
removed: string;
```

Fired when item is removed

#### events.updated

```ts
updated: string;
```

Fired when item is updated

### get?

```ts
optional get: object;
```

Grouped API: Explicit data fetching (bypass cache)

Direct network calls that always hit the server.
Useful for refresh actions or real-time data requirements.

#### get.item()

```ts
item: (id) =&gt; Promise&lt;T&gt;;
```

Get item from server (bypass cache)

Always fetches fresh data from the server, ignoring cache.
Use for explicit refresh actions or real-time requirements.

##### Parameters

###### id

Item identifier

`string` | `number`

##### Returns

`Promise`&lt;`T`&gt;

Promise resolving to the item

#### get.list()

```ts
list: (query?) =&gt; Promise&lt;ListResponse&lt;T&gt;&gt;;
```

Get list from server (bypass cache)

Always fetches fresh data from the server, ignoring cache.
Use for explicit refresh actions or real-time requirements.

##### Parameters

###### query?

`TQuery`

Optional query parameters

##### Returns

`Promise`&lt;[`ListResponse`](ListResponse.md)&lt;`T`&gt;&gt;

Promise resolving to list response

### mutate?

```ts
optional mutate: object;
```

Grouped API: Mutations (CRUD operations)

Write operations that modify server state.

#### mutate.create()

```ts
create: (data) =&gt; Promise&lt;T&gt;;
```

Create new item

##### Parameters

###### data

`Partial`&lt;`T`&gt;

##### Returns

`Promise`&lt;`T`&gt;

#### mutate.remove()

```ts
remove: (id) =&gt; Promise&lt;void&gt;;
```

Delete item

##### Parameters

###### id

`string` | `number`

##### Returns

`Promise`&lt;`void`&gt;

#### mutate.update()

```ts
update: (id, data) =&gt; Promise&lt;T&gt;;
```

Update existing item

##### Parameters

###### id

`string` | `number`

###### data

`Partial`&lt;`T`&gt;

##### Returns

`Promise`&lt;`T`&gt;

### prefetchGet()?

```ts
optional prefetchGet: (id) =&gt; Promise&lt;void&gt;;
```

Prefetch a single item into the cache

Useful for optimistic loading or preloading data before navigation.
Does not return the data, only ensures it's in the cache.

#### Parameters

##### id

Item identifier

`string` | `number`

#### Returns

`Promise`&lt;`void`&gt;

Promise resolving when prefetch completes

#### Example

```ts
// Prefetch on hover
&lt;Link onMouseEnter={() =&gt; thing.prefetchGet(123)}&gt;
  View Thing
&lt;/Link&gt;
```

### prefetchList()?

```ts
optional prefetchList: (query?) =&gt; Promise&lt;void&gt;;
```

Prefetch a list of items into the cache

Useful for optimistic loading or preloading data before navigation.
Does not return the data, only ensures it's in the cache.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Promise`&lt;`void`&gt;

Promise resolving when prefetch completes

#### Example

```ts
// Prefetch on app mount
useEffect(() =&gt; {
  thing.prefetchList({ status: 'active' });
}, []);
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
item: (id) =&gt; T | undefined;
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
items: () =&gt; T[];
```

Get all cached items (no fetch)

##### Returns

`T`[]

Array of all cached items

#### select.list()

```ts
list: (query?) =&gt; T[];
```

Get cached list by query (no fetch)

##### Parameters

###### query?

`TQuery`

Query parameters

##### Returns

`T`[]

Array of items matching query or empty array

### useGet()?

```ts
optional useGet: (id) =&gt; object;
```

React hook to fetch a single item

Uses @wordpress/data's useSelect under the hood.
Automatically handles loading states and re-fetching.
Requires the `@wpkernel/ui` package to register hooks.

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

##### error

```ts
error: string | undefined;
```

##### isLoading

```ts
isLoading: boolean;
```

#### Example

```ts
function ThingView({ id }: { id: number }) {
  const { data: thing, isLoading } = thing.useGet(id);
  if (isLoading) return &lt;Spinner /&gt;;
  return &lt;div&gt;{thing.title}&lt;/div&gt;;
}
```

### useList()?

```ts
optional useList: (query?) =&gt; object;
```

React hook to fetch a list of items

Uses @wordpress/data's useSelect under the hood.
Automatically handles loading states and re-fetching.
Requires the `@wpkernel/ui` package to register hooks.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`object`

Hook result with data, isLoading, error

##### data

```ts
data: ListResponse&lt;T&gt; | undefined;
```

##### error

```ts
error: string | undefined;
```

##### isLoading

```ts
isLoading: boolean;
```

#### Example

```ts
function ThingList({ status }: { status: string }) {
  const { data, isLoading } = thing.useList({ status });
  if (isLoading) return &lt;Spinner /&gt;;
  return &lt;List items={data?.items} /&gt;;
}
```

## Type Parameters

### T

`T` = `unknown`

The resource entity type

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations

### TRoutes

`TRoutes` *extends* [`ResourceRoutes`](ResourceRoutes.md) = [`ResourceRoutes`](ResourceRoutes.md)

## Example

```ts
const thing = defineResource&lt;Thing, { q?: string }&gt;({ ... });

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
