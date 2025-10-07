[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / defineResource

# Function: defineResource()

```ts
function defineResource<T, TQuery>(config): ResourceObject<T, TQuery>;
```

Define a resource with typed REST client

Creates a resource object with:

- Typed client methods (fetchList, fetch, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select._, use._, get._, mutate._, cache._, storeApi._, events.\*)

## Type Parameters

### T

`T` = `unknown`

Resource entity type (e.g., TestimonialPost)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { search?: string })

## Parameters

### config

[`ResourceConfig`](../type-aliases/ResourceConfig.md)\<`T`, `TQuery`\>

Resource configuration

## Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)\<`T`, `TQuery`\>

Resource object with client methods and metadata

## Throws

DeveloperError if configuration is invalid

## Example

```ts
// Auto-detection (90% case) - namespace detected from plugin context
const testimonial = defineResource<TestimonialPost, { search?: string }>({
	name: 'testimonial',
	routes: {
		list: { path: '/my-plugin/v1/testimonials', method: 'GET' },
		get: { path: '/my-plugin/v1/testimonials/:id', method: 'GET' },
		create: { path: '/my-plugin/v1/testimonials', method: 'POST' },
	},
	cacheKeys: {
		list: (q) => ['testimonial', 'list', q?.search],
		get: (id) => ['testimonial', 'get', id],
	},
});
// Events: 'my-plugin.testimonial.created', Store: 'my-plugin/testimonial'

// Explicit namespace override
const job = defineResource<Job>({
	name: 'job',
	namespace: 'custom-hr',
	routes: { list: { path: '/custom-hr/v1/jobs', method: 'GET' } },
});
// Events: 'custom-hr.job.created', Store: 'custom-hr/job'

// Shorthand namespace:name syntax
const task = defineResource<Task>({
	name: 'acme:task',
	routes: { list: { path: '/acme/v1/tasks', method: 'GET' } },
});
// Events: 'acme.task.created', Store: 'acme/task'
```
