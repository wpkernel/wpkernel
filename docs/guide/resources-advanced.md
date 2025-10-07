# Advanced Resources: Grouped API

> **For power users:** This guide covers the grouped API surface for resources. Most developers should use the [thin-flat API](./resources.md) instead.

The grouped API provides namespaced methods for explicit control over data fetching, caching, and mutations. Use this when you need fine-grained control over cache behavior or when building advanced data patterns.

## When to Use Grouped API

Use the grouped API when:

- You need explicit cache control (bypass cache, force refresh)
- Building complex data patterns (optimistic updates, parallel fetching)
- Performance-critical code where you want explicit behavior
- You prefer namespaced organization for clarity

**For most cases, use the thin-flat API** - it's simpler and more ergonomic.

## API Overview

```typescript
testimonial.select.*    // Pure selectors (no fetching)
testimonial.use.*       // React hooks (with fetching)
testimonial.fetch.*     // Explicit network calls (bypass cache)
testimonial.mutate.*    // Write operations
testimonial.cache.*     // Cache control (prefetch, invalidate, keys)
testimonial.storeApi.*  // Direct store API access
testimonial.events.*    // Event helpers
```

## Pure Selectors (`select.*`)

Read cached data **without triggering network requests**. Returns `undefined` if not cached.

### `select.item(id)`

Get cached item by ID (no fetch).

```typescript
import { select } from '@wordpress/data';

// In a selector or computed value
const cached = select(testimonial.store).select.item(123);
if (cached) {
	// Use cached data
} else {
	// Data not in cache - need to fetch
}
```

**Use case**: Check if data exists before deciding whether to fetch.

### `select.items()`

Get all cached items (no fetch).

```typescript
const allCached = select(testimonial.store).select.items();
// Returns array of all testimonials in cache
```

**Use case**: Build derived state from cached data.

### `select.list(query)`

Get cached list by query (no fetch).

```typescript
const cachedList = select(testimonial.store).select.list({ rating: 5 });
// Returns array of items matching query, or empty array if not cached
```

**Use case**: Read from cache without triggering re-fetch.

## React Hooks (`use.*`)

**Note:** React hooks are provided by `@geekist/wp-kernel-ui` package. The thin-flat API (`useGet`, `useList`) is recommended.

### `useGet(id)` (from @geekist/wp-kernel-ui)

React hook for fetching a single item with loading states.

```typescript
function TestimonialView({ id }: { id: number }) {
	const { data, isLoading, error } = testimonial.useGet(id);

	if (isLoading) return <Spinner />;
	if (error) return <Notice status="error">{error}</Notice>;

	return <div>{data.title}</div>;
}
```

### `useList(query?)` (from @geekist/wp-kernel-ui)

React hook for fetching a list with loading states.

```typescript
function TestimonialList() {
	const { data, isLoading, error } = testimonial.useList({ rating: 5 });

	if (isLoading) return <Spinner />;
	return <List items={data?.items} />;
}
```

## Explicit Fetching (`fetch.*`)

**Always** hit the network, bypassing cache. Use when you need fresh data regardless of cache state.

### `fetch.item(id)`

Fetch item from server (bypass cache).

```typescript
// Force refresh from server
const fresh = await testimonial.fetch.item(123);

// Useful for "refresh" actions
async function handleRefresh() {
	const fresh = await testimonial.fetch.item(currentId);
	// Updates cache with fresh data
}
```

**Returns**: `Promise<T>`

**Use case**: User explicitly requests fresh data (refresh button, pull-to-refresh).

### `fetch.list(query?)`

Fetch list from server (bypass cache).

```typescript
// Force refresh list
const { items, total } = await testimonial.fetch.list({ rating: 5 });

// Useful for real-time updates
setInterval(async () => {
	const latest = await testimonial.fetch.list({ featured: true });
	// Always gets latest from server
}, 30000);
```

**Returns**: `Promise<ListResponse<T>>`

**Use case**: Real-time dashboards, polling, explicit refresh.

## Mutations (`mutate.*`)

Write operations. **Only use from Actions, never from UI.**

### `mutate.create(data)`

Same as `testimonial.create(data)` from thin-flat API.

```typescript
// In an Action
const created = await testimonial.mutate.create({
	title: 'Great service!',
	rating: 5,
});
```

**Returns**: `Promise<T>`

### `mutate.update(id, data)`

Same as `testimonial.update(id, data)` from thin-flat API.

```typescript
// In an Action
const updated = await testimonial.mutate.update(123, { rating: 4 });
```

**Returns**: `Promise<T>`

### `mutate.remove(id)`

Same as `testimonial.remove(id)` from thin-flat API.

```typescript
// In an Action
await testimonial.mutate.remove(123);
```

**Returns**: `Promise<void>`

## Cache Control (`cache.*`)

Fine-grained cache management operations.

### `cache.prefetch.item(id)`

Same as `testimonial.prefetchGet(id)` from thin-flat API.

```typescript
// Prefetch on hover
<Link onMouseEnter={() => testimonial.cache.prefetch.item(123)}>
	View Testimonial
</Link>
```

**Returns**: `Promise<void>`

### `cache.prefetch.list(query?)`

Same as `testimonial.prefetchList(query)` from thin-flat API.

```typescript
// Prefetch on mount
useEffect(() => {
	testimonial.cache.prefetch.list({ featured: true });
}, []);
```

**Returns**: `Promise<void>`

### `cache.invalidate.item(id)`

Invalidate single item by ID.

```typescript
// In an Action after updating
await testimonial.mutate.update(123, data);
testimonial.cache.invalidate.item(123);
```

**More explicit than**: `testimonial.invalidate([['testimonial', 'get', 123]])`

### `cache.invalidate.list(query?)`

Invalidate list by query.

```typescript
// Invalidate specific query
testimonial.cache.invalidate.list({ rating: 5 });

// Invalidate all lists
testimonial.cache.invalidate.list();
```

### `cache.invalidate.all()`

Invalidate **all** cached data for this resource.

```typescript
// Nuclear option - clear everything
testimonial.cache.invalidate.all();
```

**Use case**: User logs out, permission change, or major state change.

### `cache.key(operation, params?)`

Same as `testimonial.key(operation, params)` from thin-flat API.

```typescript
const key = testimonial.cache.key('list', { rating: 5 });
// => ['testimonial', 'list', '{"rating":5}']
```

## Store API Access (`storeApi.*`)

Direct access to `@wordpress/data` store API. For advanced patterns only.

### `storeApi.select`

Direct selector access (same as `select(testimonial.store)`).

```typescript
const item = testimonial.storeApi.select.getItem(123);
const isResolving = testimonial.storeApi.select.isResolving('getItem', [123]);
```

### `storeApi.dispatch`

Direct dispatch access (same as `dispatch(testimonial.store)`).

```typescript
// Manually update store
testimonial.storeApi.dispatch.receiveItem({ id: 123, title: 'Updated' });

// Manually trigger resolution
testimonial.storeApi.dispatch.startResolution('getItem', [123]);
```

## Event Helpers (`events.*`)

Event subscription helpers. For advanced hooking patterns.

### `events.on(eventName, callback)`

Subscribe to resource-specific events.

```typescript
// Listen for testimonial created
testimonial.events.on('wpk.testimonial.created', ({ id, data }) => {
	console.log('Testimonial created:', id);
});
```

### `events.off(eventName, callback)`

Unsubscribe from events.

```typescript
const handler = (data) => console.log(data);
testimonial.events.on('wpk.testimonial.created', handler);

// Later...
testimonial.events.off('wpk.testimonial.created', handler);
```

## Advanced Patterns

### Optimistic Updates

Update UI immediately, rollback on error.

```typescript
async function optimisticUpdate(id: number, data: Partial<TestimonialPost>) {
	// Get current data
	const current = testimonial.select.item(id);

	// Optimistically update store
	testimonial.storeApi.dispatch.receiveItem({ ...current, ...data });

	try {
		// Attempt server update
		await testimonial.mutate.update(id, data);
	} catch (error) {
		// Rollback on error
		testimonial.storeApi.dispatch.receiveItem(current);
		throw error;
	}
}
```

### Parallel Prefetching

Load multiple resources concurrently.

```typescript
async function prefetchTestimonialPage(id: number) {
	await Promise.all([
		testimonial.cache.prefetch.item(id),
		testimonial.cache.prefetch.list({ featured: true }),
		relatedResource.cache.prefetch.list({ testimonialId: id }),
	]);
}
```

### Conditional Fetching

Fetch only if not cached.

```typescript
async function ensureTestimonial(id: number) {
	const cached = testimonial.select.item(id);

	if (cached) {
		return cached; // Use cached
	}

	// Not cached - fetch fresh
	return await testimonial.fetch.item(id);
}
```

### Cache Warming

Pre-populate cache with known data.

```typescript
// After SSR or initial data load
const initialTestimonials = [
	/* ... */
];

initialTestimonials.forEach((item) => {
	testimonial.storeApi.dispatch.receiveItem(item);
});
```

### Polling with Fresh Data

Poll server for updates without cache interference.

```typescript
function usePolling(interval: number) {
	useEffect(() => {
		const poll = async () => {
			// Always fetch fresh (bypass cache)
			const fresh = await testimonial.fetch.list({ featured: true });
			// Cache is automatically updated
		};

		const id = setInterval(poll, interval);
		return () => clearInterval(id);
	}, [interval]);
}
```

### Selective Invalidation

Invalidate only specific cache keys.

```typescript
// After updating featured status
await testimonial.mutate.update(id, { featured: true });

// Invalidate specific item and featured list only
testimonial.cache.invalidate.item(id);
testimonial.cache.invalidate.list({ featured: true });
// Other lists (rating:5, etc.) remain cached
```

## Thin-Flat API (Recommended)

The thin-flat API provides direct access to resource methods:

| Task          | API                                | Package                       |
| ------------- | ---------------------------------- | ----------------------------- |
| Fetch item    | `testimonial.useGet(id)`           | @geekist/wp-kernel-ui         |
| Fetch list    | `testimonial.useList(query)`       | @geekist/wp-kernel-ui         |
| Create        | `testimonial.create(data)`         | @geekist/wp-kernel            |
| Update        | `testimonial.update(id, data)`     | @geekist/wp-kernel            |
| Delete        | `testimonial.remove(id)`           | @geekist/wp-kernel            |
| Prefetch item | `testimonial.prefetchGet(id)`      | @geekist/wp-kernel            |
| Prefetch list | `testimonial.prefetchList(query)`  | @geekist/wp-kernel            |
| Invalidate    | `testimonial.invalidate(patterns)` | @geekist/wp-kernel            |
| Cache key     | `testimonial.key(op, params)`      | @geekist/wp-kernel            |
| Check cache   | N/A                                | `testimonial.select.item(id)` |
| Force fetch   | N/A                                | `testimonial.fetch.item(id)`  |

## Performance Considerations

### When to Bypass Cache

Use `fetch.*` methods when:

- User explicitly requests refresh
- Real-time data is critical (dashboards, monitoring)
- Data is known to be stale
- Implementing polling/websocket updates

**Don't** use `fetch.*` by default - it defeats caching benefits.

### When to Use Pure Selectors

Use `select.*` methods when:

- Building derived state from cached data
- Checking if data exists before fetch
- Reading from cache in non-React contexts
- Performance-critical code paths

### Prefetch Strategy

Prefetch data when:

- User is likely to navigate somewhere (hover, route change)
- Initial page load completes (idle time)
- Background tab becomes active
- User completes a related action

**Don't** over-prefetch - it wastes bandwidth and defeats cache limits.

## See Also

- [Resources Guide](./resources.md) - Thin-flat API (recommended)
- [Actions Guide](./actions.md) - Using resources in actions
- [API Reference](/api/resources) - Complete API documentation
