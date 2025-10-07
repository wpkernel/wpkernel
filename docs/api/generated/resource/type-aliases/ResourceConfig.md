[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceConfig

# Type Alias: ResourceConfig\<T, TQuery, \_TTypes\>

```ts
type ResourceConfig<T, TQuery, _TTypes> = object;
```

Complete resource definition configuration

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({
	name: 'thing',
	routes: {
		list: { path: '/my-plugin/v1/things', method: 'GET' },
		get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
	},
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q],
		get: (id) => ['thing', 'get', id],
	},
	schema: import('./thing.schema.json'),
});
```

## Type Parameters

### T

`T` = `unknown`

The resource entity type (e.g., Thing)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { q?: string })

### \_TTypes

`_TTypes` = \[`T`, `TQuery`\]

## Properties

### name

```ts
name: string;
```

Unique resource name (lowercase, singular recommended)

Used for store keys, event names, and debugging

---

### routes

```ts
routes: ResourceRoutes;
```

REST route definitions

Define only the operations your resource supports

---

### cacheKeys?

```ts
optional cacheKeys: CacheKeys;
```

Cache key generators

Optional. If omitted, default cache keys based on resource name will be used

---

### namespace?

```ts
optional namespace: string;
```

Namespace for events and store keys

Optional. If omitted, namespace will be auto-detected from plugin context.
For explicit control, provide a namespace string.

#### Example

```ts
namespace: 'my-plugin'; // Explicit namespace
// OR
name: 'my-plugin:job'; // Shorthand namespace:name format
```

---

### schema?

```ts
optional schema: Promise<unknown> | unknown;
```

JSON Schema for runtime validation

Optional. Provides runtime type safety and validation errors

#### Example

```ts
schema: import('../../contracts/thing.schema.json');
```
