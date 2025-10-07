# Resources

> **Status**: ✓ Core API implemented in Sprint 1 (A2: defineResource, A3: Store & Transport, A4: Cache Invalidation)

Resources define your typed REST contracts. One definition gives you:

- Typed REST client with automatic method generation
- WordPress data store integration (`@wordpress/data`)
- Automatic cache management and invalidation
- React hooks for data fetching
- Full TypeScript type safety

**Two API surfaces**: Resources provide both a **thin-flat API** (recommended for most cases) and a **grouped API** (power users). See [Advanced Resources Guide](./resources-advanced.md) for grouped API patterns.

## Quick Start

```typescript
import { defineResource } from '@geekist/wp-kernel/resource';

interface TestimonialPost {
	id: number;
	title: string;
	content: string;
	author: string;
	rating: number;
}

interface TestimonialQuery {
	search?: string;
	rating?: number;
	page?: number;
}

export const testimonial = defineResource<TestimonialPost, TestimonialQuery>({
	name: 'testimonial',                    // Namespace auto-detected from plugin context
	routes: {
		list: { path: '/acme-blog/v1/testimonials', method: 'GET' },
		get: { path: '/acme-blog/v1/testimonials/:id', method: 'GET' },
		create: { path: '/acme-blog/v1/testimonials', method: 'POST' },
		update: { path: '/acme-blog/v1/testimonials/:id', method: 'PUT' },
		remove: { path: '/acme-blog/v1/testimonials/:id', method: 'DELETE' },
	},
	cacheKeys: {
		list: (q) => ['testimonial', 'list', q?.search, q?.rating, q?.page],
		get: (id) => ['testimonial', 'get', id],
	},
});

// Events use auto-detected namespace (e.g., plugin slug: "acme-blog")
console.log(testimonial.events.created); // 'acme-blog.testimonial.created'
console.log(testimonial.storeKey);       // 'acme-blog/testimonial'

// Override namespace when needed
export const enterpriseTestimonial = defineResource<TestimonialPost>({
	name: 'testimonial',
	namespace: 'enterprise-suite',          // Explicit override
	routes: { /* ... */ }
});
console.log(enterpriseTestimonial.events.created); // 'enterprise-suite.testimonial.created'

// ✓ Use in Actions (write path - orchestrated)
import { CreateTestimonial } from '@/actions/Testimonial/Create';
await CreateTestimonial({ data: { title: 'Great service!', rating: 5 } });

// ✓ Use React hooks (read path)
function TestimonialList() {
	const { data, isLoading } = testimonial.useList({ rating: 5 });

	if (isLoading) return <Spinner />;
	return <ul>{data?.items.map(item => <li key={item.id}>{item.title}</li>)}</ul>;
}
```

## Configuration

### Required Properties

#### `name` \<string\>

Unique resource name (lowercase, kebab-case recommended).

- Used for store keys (`wpk/{name}`)
- Used for event names
- Must match `/^[a-z][a-z0-9-]*$/`

```typescript
// ✓ Good
name: 'testimonial';
name: 'team-member';
name: 'portfolio-item';

// ✗ Bad - throws DeveloperError
name: 'Testimonial'; // uppercase
name: 'my_testimonial'; // underscores
name: 'my testimonial'; // spaces
```

#### `routes` \<object\>

REST route definitions. At least one route must be defined.

Each route has:

- `path` (string) - REST endpoint path with optional `:param` placeholders
- `method` (HttpMethod) - `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`

```typescript
routes: {
  list: { path: '/wpk/v1/testimonials', method: 'GET' },
  get: { path: '/wpk/v1/testimonials/:id', method: 'GET' },
  create: { path: '/wpk/v1/testimonials', method: 'POST' },
  update: { path: '/wpk/v1/testimonials/:id', method: 'PUT' },
  remove: { path: '/wpk/v1/testimonials/:id', method: 'DELETE' }
}
```

**Path Parameters**: Multi-segment paths with multiple parameters are fully supported:

```typescript
// Single parameter
'/wpk/v1/testimonials/:id'; // → /wpk/v1/testimonials/123

// Multiple parameters
'/wpk/v1/testimonials/:id/comments/:commentId'; // → /wpk/v1/testimonials/42/comments/99

// Supported patterns: :id, :slug, :userId, :_id, :$id
```

::: tip Multi-Parameter Support
Multi-parameter interpolation is fully supported. All path parameters are type-safe and validated at runtime.
:::

### Optional Properties

#### `cacheKeys` \<object\>

Functions to generate cache keys for each operation. Defaults to sensible keys if omitted.

```typescript
cacheKeys: {
  list: (query) => ['testimonial', 'list', query?.search, query?.rating],
  get: (id) => ['testimonial', 'get', id],
  create: (data) => ['testimonial', 'create'],
  update: (id) => ['testimonial', 'update', id],
  remove: (id) => ['testimonial', 'remove', id]
}
```

::: warning Avoid Timestamps in Cache Keys
Don't use `Date.now()` or timestamps in cache keys-it makes invalidation impossible. Use timestamps only for specific time-sensitive use cases (see Advanced Patterns).
:::

#### `schema` \<Promise\<unknown\>\>

JSON Schema for runtime validation (coming in future sprints).

```typescript
schema: import('../../contracts/testimonial.schema.json');
```

### TypeScript Generics

Resources accept two generic type parameters:

```typescript
defineResource<T, TQuery>({...})
//              ^  ^^^^^^
//              |  Query parameters type (for list)
//              Resource entity type
```

#### `T` - Resource Entity Type

```typescript
interface TestimonialPost {
	id: number;
	title: string;
	content: string;
	author: string;
	rating: number;
}

const testimonial = defineResource<TestimonialPost>({ ... });

// Methods are fully typed
const item: TestimonialPost = await testimonial.fetch(123);
```

#### `TQuery` - List Query Parameters

```typescript
interface TestimonialQuery {
	search?: string;
	rating?: number;
	page?: number;
}

const testimonial = defineResource<TestimonialPost, TestimonialQuery>({ ... });

// Query types are enforced
await testimonial.fetchList({ search: 'great', page: 1 }); // ✓
await testimonial.fetchList({ invalid: 'param' });          // ✗ TypeScript error
```

### Validation

`defineResource` validates configuration at dev-time and throws `DeveloperError` for issues:

```typescript
// ✗ Missing name
defineResource({ routes: { ... } });
// DeveloperError: Resource config must have a valid "name" property

// ✗ Invalid name format
defineResource({ name: 'My_Testimonial', routes: { ... } });
// DeveloperError: Resource name must be lowercase with hyphens only

// ✗ No routes
defineResource({ name: 'testimonial', routes: {} });
// DeveloperError: Resource "testimonial" must define at least one route

// ✗ Invalid HTTP method
defineResource({ name: 'testimonial', routes: { list: { path: '/api', method: 'FETCH' } } });
// DeveloperError: Invalid HTTP method "FETCH"
```

defineResource({ name: 'My_Thing', routes: { ... } });
// DeveloperError: Resource name must be lowercase with hyphens only

// ✗ No routes

## Thin-Flat API (Recommended)

The thin-flat API provides direct access to common operations without nesting. This is the **recommended API** for most use cases.

### Direct Client Methods

::: warning Actions-First Architecture
**Never call write methods (`create`, `update`, `remove`) directly from UI components.** Always route through Actions for proper event emission, cache invalidation, and job orchestration.

```typescript
// ✗ BAD - Direct write from UI
async function handleSubmit() {
	await testimonial.create(formData); // Bypasses Actions layer!
}

// ✓ GOOD - Route through Action
import { CreateTestimonial } from '@/actions/Testimonial/Create';
async function handleSubmit() {
	await CreateTestimonial({ data: formData });
}
```

**Read methods (`fetchList`, `fetch`) are safe** to call directly for non-UI use cases (data migration, CLI tools, etc.).
:::

#### fetchList(query?)

Fetch a collection of resources. **Always destructure the response** to access items and metadata.

```typescript
const { items, total, hasMore, nextCursor } = await testimonial.fetchList({
	search: 'excellent',
	rating: 5,
	page: 1,
});
```

**Returns**: `Promise<ListResponse<T>>`

- `items: T[]` - Array of resources
- `total?: number` - Total count (if available)
- `hasMore?: boolean` - Whether more pages exist
- `nextCursor?: string` - Pagination cursor

#### fetch(id)

Fetch a single resource by ID.

```typescript
const item: TestimonialPost = await testimonial.fetch(123);
```

**Returns**: `Promise<T>`

#### create(data)

Create a new resource. **Use only from Actions, never from UI.**

```typescript
// In an Action
const created = await testimonial.create({
	title: 'Amazing product!',
	content: 'Best purchase ever...',
	author: 'Jane Doe',
	rating: 5,
});
```

**Returns**: `Promise<T>`

#### update(id, data)

Update an existing resource. **Use only from Actions, never from UI.**

```typescript
// In an Action
const updated = await testimonial.update(123, { rating: 4 });
```

**Returns**: `Promise<T>`

#### remove(id)

Delete a resource. **Use only from Actions, never from UI.**

```typescript
// In an Action
await testimonial.remove(123);
```

**Returns**: `Promise<void>`

### React Hooks

React hooks for data fetching with automatic loading states and re-fetching. Importing `@geekist/wp-kernel-ui`
automatically registers the hooks for resources defined with `defineResource()`.

#### useGet(id)

Fetch and watch a single item. Automatically handles loading states.

```typescript
function TestimonialView({ id }: { id: number }) {
	const { data: testimonial, isLoading, error } = testimonial.useGet(id);

	if (isLoading) return <Spinner />;
	if (error) return <Notice status="error">{error}</Notice>;

	return (
		<div>
			<h2>{testimonial.title}</h2>
			<p>{testimonial.content}</p>
			<Rating value={testimonial.rating} />
		</div>
	);
}
```

**Returns**: `{ data: T | undefined, isLoading: boolean, error: string | undefined }`

#### useList(query?)

Fetch and watch a list of items. Automatically handles loading states.

```typescript
function TestimonialList({ rating }: { rating?: number }) {
	const { data, isLoading, error } = testimonial.useList({ rating });

	if (isLoading) return <Spinner />;
	if (error) return <Notice status="error">{error}</Notice>;

	return (
		<ul>
			{data?.items.map(item => (
				<li key={item.id}>
					{item.title} - {item.author}
				</li>
			))}
		</ul>
	);
}
```

**Returns**: `{ data: ListResponse<T> | undefined, isLoading: boolean, error: string | undefined }`

### Prefetch Methods

Load data into cache without rendering. Useful for optimistic loading.

#### prefetchGet(id)

Prefetch a single item before navigation or on hover.

```typescript
function TestimonialCard({ id }: { id: number }) {
	return (
		<Link
			to={`/testimonials/${id}`}
			onMouseEnter={() => testimonial.prefetchGet(id)}
		>
			View Testimonial
		</Link>
	);
}
```

**Returns**: `Promise<void>`

#### prefetchList(query?)

Prefetch a list on app mount or route change.

```typescript
function TestimonialPage() {
	useEffect(() => {
		// Preload featured testimonials
		testimonial.prefetchList({ rating: 5 });
	}, []);

	return <TestimonialList />;
}
```

**Returns**: `Promise<void>`

### Cache Management

#### invalidate(patterns)

Invalidate cached data for this resource. Scoped to the resource's store.

```typescript
// In an Action after creating
await testimonial.create(data);
testimonial.invalidate([['testimonial', 'list']]); // Invalidate all lists

// In an Action after updating
await testimonial.update(id, data);
testimonial.invalidate([
	['testimonial', 'get', id], // Invalidate specific item
	['testimonial', 'list'], // Invalidate all lists
]);

// In an Action after deleting
await testimonial.remove(id);
testimonial.invalidate([
	['testimonial', 'get', id],
	['testimonial', 'list'],
]);
```

**Parameters**: `patterns: (string | number | boolean | null | undefined)[][]`

#### key(operation, params?)

Generate a cache key for manual cache operations or debugging.

```typescript
const listKey = testimonial.key('list', { rating: 5 });
// => ['testimonial', 'list', '{"rating":5}']

const getKey = testimonial.key('get', 123);
// => ['testimonial', 'get', 123]
```

**Returns**: `(string | number | boolean)[]`

## Store Integration

Each resource provides a lazy-loaded `@wordpress/data` store. The store is automatically registered on first access.

### Direct Store Access

```typescript
import { select, dispatch } from '@wordpress/data';

// Access store (auto-registers on first use)
const store = testimonial.store; // Returns store descriptor
const storeKey = testimonial.storeKey; // 'wpk/testimonial'

// Use with selectors (advanced - prefer hooks)
const item = select(store).getItem(123);
const items = select(store).getItems({ rating: 5 });
```

::: tip Prefer React Hooks
Use `testimonial.useGet()` and `testimonial.useList()` instead of direct store access in React components. Direct store access is for advanced patterns only.
:::

## Resource Events

Resources automatically emit events during transport operations:

- `wpk.resource.request` - Before REST call
- `wpk.resource.response` - After successful response
- `wpk.resource.error` - On request failure

See [Events Guide](./events.md) for full event taxonomy and hooking patterns.

## Grouped API

For power users, resources provide a **grouped API** with namespaced methods:

```typescript
// Grouped API (power users)
const cached = testimonial.select.item(123); // Pure selector (no fetch)
const { data } = testimonial.use.item(123); // React hook
await testimonial.fetch.item(123); // Explicit fetch (bypass cache)
await testimonial.mutate.create(data); // Write operation
await testimonial.cache.prefetch.item(123); // Prefetch
testimonial.cache.invalidate.all(); // Invalidate all
```

See [Advanced Resources Guide](./resources-advanced.md) for complete grouped API documentation.

## Complete Example

```typescript
// app/resources/Testimonial.ts
import { defineResource } from '@geekist/wp-kernel/resource';

export interface TestimonialPost {
	id: number;
	title: string;
	content: string;
	author: string;
	rating: number;
	featured: boolean;
	createdAt: string;
}

export interface TestimonialQuery {
	search?: string;
	rating?: number;
	featured?: boolean;
	page?: number;
}

export const testimonial = defineResource<TestimonialPost, TestimonialQuery>({
	name: 'testimonial',
	routes: {
		list: { path: '/wpk/v1/testimonials', method: 'GET' },
		get: { path: '/wpk/v1/testimonials/:id', method: 'GET' },
		create: { path: '/wpk/v1/testimonials', method: 'POST' },
		update: { path: '/wpk/v1/testimonials/:id', method: 'PUT' },
		remove: { path: '/wpk/v1/testimonials/:id', method: 'DELETE' },
	},
	cacheKeys: {
		list: (q) => [
			'testimonial',
			'list',
			q?.search,
			q?.rating,
			q?.featured,
			q?.page,
		],
		get: (id) => ['testimonial', 'get', id],
	},
});
```

```typescript
// app/actions/Testimonial/Create.ts
import { defineAction } from '@geekist/wp-kernel/actions';
import { testimonial } from '@/resources/Testimonial';
import { events } from '@geekist/wp-kernel/events';

export const CreateTestimonial = defineAction(
	'Testimonial.Create',
	async ({ data }: { data: Partial<TestimonialPost> }) => {
		// Permission check
		if (!currentUserCan('create_testimonials')) {
			throw new PolicyDenied('testimonials.create');
		}

		// Create via resource
		const created = await testimonial.create(data);

		// Emit event
		CreateTestimonial.emit(events.testimonial.created, {
			id: created.id,
			data: created,
		});

		// Invalidate cache
		testimonial.invalidate([['testimonial', 'list']]);

		// Queue job if needed
		if (data.featured) {
			await jobs.enqueue('NotifyFeaturedTestimonial', { id: created.id });
		}

		return created;
	}
);
```

```typescript
// app/views/TestimonialList.tsx
import { testimonial } from '@/resources/Testimonial';
import { CreateTestimonial } from '@/actions/Testimonial/Create';

export function TestimonialList() {
	const { data, isLoading, error } = testimonial.useList({
		featured: true,
		rating: 5
	});

	if (isLoading) return <Spinner />;
	if (error) return <Notice status="error">{error}</Notice>;

	return (
		<div>
			<h2>Featured Testimonials ({data?.total})</h2>
			<ul>
				{data?.items.map(item => (
					<li key={item.id}>
						<h3>{item.title}</h3>
						<p>{item.content}</p>
						<Rating value={item.rating} />
						<cite>- {item.author}</cite>
					</li>
				))}
			</ul>
			{data?.hasMore && (
				<Button onClick={() => loadMore()}>Load More</Button>
			)}
		</div>
	);
}

async function handleCreate(formData: Partial<TestimonialPost>) {
	// ✓ CORRECT - Route through Action
	await CreateTestimonial({ data: formData });
}
```

## Best Practices

### 1. Actions-First for Writes

**Never call write methods directly from UI components.** Always route through Actions.

```typescript
// ✗ BAD - Direct write from UI
await testimonial.create(data);

// ✓ GOOD - Route through Action
await CreateTestimonial({ data });
```

### 2. Co-locate Resources with Types

```typescript
// app/resources/Testimonial.ts
export interface TestimonialPost {
	id: number;
	title: string;
	// ...
}

export interface TestimonialQuery {
	search?: string;
	rating?: number;
}

export const testimonial = defineResource<TestimonialPost, TestimonialQuery>({ ... });
```

### 3. Use Consistent Naming

Match resource names to REST endpoints (lowercase, singular):

```typescript
// Custom REST: /wpk/v1/testimonials
name: 'testimonial';

// WordPress Core REST: /wp/v2/posts
name: 'post';
```

### 4. Define Granular Cache Keys

More specific keys = better invalidation control:

```typescript
// ✗ Too broad - invalidates ALL lists
cacheKeys: {
	list: () => ['testimonial', 'list'];
}

// ✓ Granular - invalidate by rating/featured status
cacheKeys: {
	list: (q) => ['testimonial', 'list', q?.rating, q?.featured, q?.page];
}
```

### 5. Always Type Your Queries

```typescript
// ✓ Typed - enforces query parameters
defineResource<TestimonialPost, TestimonialQuery>({ ... })

// ✗ Untyped - accepts any query
defineResource<TestimonialPost>({ ... })
```

### 6. Use React Hooks, Not Direct Calls

```typescript
// ✗ Don't fetch directly in components
function MyComponent() {
	const [items, setItems] = useState([]);
	useEffect(() => {
		testimonial.fetchList().then(setItems);
	}, []);
}

// ✓ Use hooks (auto-caching, auto-loading)
function MyComponent() {
	const { data, isLoading } = testimonial.useList();
}
```

### 7. Invalidate After Writes (in Actions)

Always invalidate affected caches in your Actions:

```typescript
// In Action
await testimonial.update(id, data);
testimonial.invalidate([
	['testimonial', 'get', id],
	['testimonial', 'list'],
]);
```

## Advanced Patterns

### Partial Resource Definitions

You don't need all CRUD operations:

```typescript
// Read-only resource
const testimonial = defineResource<TestimonialPost>({
	name: 'testimonial',
	routes: {
		list: { path: '/wpk/v1/testimonials', method: 'GET' },
		get: { path: '/wpk/v1/testimonials/:id', method: 'GET' },
	},
});

// Write methods are undefined
testimonial.fetchList(); // ✓ Available
testimonial.fetch(1); // ✓ Available
testimonial.create; // undefined
```

### Custom HTTP Methods

Use `PATCH` for partial updates:

```typescript
routes: {
	update: { path: '/wpk/v1/testimonials/:id', method: 'PATCH' }
}
```

### Nested Resources

Define resources with multi-parameter paths:

```typescript
const comment = defineResource<Comment>({
	name: 'comment',
	routes: {
		list: {
			path: '/wpk/v1/testimonials/:testimonialId/comments',
			method: 'GET',
		},
		get: {
			path: '/wpk/v1/testimonials/:testimonialId/comments/:id',
			method: 'GET',
		},
	},
});

// Pass parameters as object with named keys
await comment.list({ testimonialId: 42 });
// → /wpk/v1/testimonials/42/comments

await comment.get({ testimonialId: 42, id: 7 });
// → /wpk/v1/testimonials/42/comments/7
```

### Custom Cache Strategy

```typescript
cacheKeys: {
	// Include user context
	get: (id) => ['testimonial', 'get', id, currentUserId],

	// Conditional keys based on query
	list: (q) => {
		const parts = ['testimonial', 'list'];
		if (q?.rating) parts.push('rating', q.rating);
		if (q?.featured) parts.push('featured', q.featured);
		return parts;
	}
}
```

## See Also

- [Advanced Resources Guide](./resources-advanced.md) - Grouped API, power patterns
- [Actions Guide](./actions.md) - Using resources in actions
- [Events Guide](./events.md) - Resource-related events
- [API Reference](/api/resources) - Complete API documentation
- [Product Spec § 4.1](https://github.com/theGeekist/wp-kernel/blob/main/information/Product%20Specification%20PO%20Draft%20•%20v1.0.md#41-resources-model--client) - Design rationale
