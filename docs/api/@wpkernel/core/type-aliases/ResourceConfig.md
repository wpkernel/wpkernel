[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceConfig

# Type Alias: ResourceConfig<T, TQuery, TRoutes, \_TTypes>

```ts
type ResourceConfig<T, TQuery, TRoutes, _TTypes> = object;
```

Declarative configuration for a resource.

This is consumed by `defineResource()` to:

- describe REST routes and capabilities
- configure cache keys and store behavior
- attach optional UI and persistence metadata for generators and tooling

## Type Parameters

### T

`T` = `unknown`

Entity shape returned by the resource (e.g. `Job`).

### TQuery

`TQuery` = `unknown`

Query shape for list operations (e.g. `{ search?: string }`).

### TRoutes

`TRoutes` _extends_ [`ResourceRoutes`](ResourceRoutes.md) = [`ResourceRoutes`](ResourceRoutes.md)

### \_TTypes

`_TTypes` = \[`T`, `TQuery`, `TRoutes`\]

Internal tuple preserved for helper typing; not intended for direct use.

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
routes: TRoutes;
```

REST route definitions

Define only the operations your resource supports

---

### cacheKeys?

```ts
optional cacheKeys: CacheKeys<TQuery>;
```

Cache key generators

Optional. If omitted, default cache keys based on resource name will be used

---

### capabilities?

```ts
optional capabilities: ResourceCapabilityMap<TRoutes>;
```

Optional inline capability mappings.

Maps capability keys (from route definitions) to WordPress capabilities.
Each resource can define its own capability mappings inline, and these
will be collected by the CLI during code generation.

#### Example

```ts
capabilities: {
  'book.create': 'edit_posts',
  'book.update': 'edit_others_posts',
  'book.delete': { capability: 'delete_posts', appliesTo: 'object', binding: 'id' }
}
```

---

### identity?

```ts
optional identity: ResourceIdentityConfig;
```

Optional identifier hints used by tooling.

The runtime ignores this field; CLI tooling can derive store defaults and route helpers.

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

### queryParams?

```ts
optional queryParams: ResourceQueryParams;
```

Optional query parameter descriptors for tooling.

---

### reporter?

```ts
optional reporter: Reporter;
```

Optional reporter override for resource instrumentation.

When provided, the resource will emit debug/info/error logs through this
reporter instead of creating a child reporter from the WPKernel instance.

---

### schema?

```ts
optional schema: Promise<unknown> | unknown | string;
```

JSON Schema for runtime validation

Optional. Provides runtime type safety and validation errors

#### Example

```ts
schema: import('../../contracts/thing.schema.json');
```

---

### storage?

```ts
optional storage: ResourceStorageConfig;
```

Optional persistence strategy metadata.

The runtime ignores this field; CLI tooling can emit registration scaffolding.

---

### store?

```ts
optional store: ResourceStoreOptions<T, TQuery>;
```

Optional overrides for store configuration.

Provided for forward compatibility with CLI-generated descriptors.

---

### ui?

```ts
optional ui: ResourceUIConfig;
```

Optional UI metadata surfaced to runtime integrations (e.g., DataViews).
