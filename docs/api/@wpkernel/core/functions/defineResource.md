[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / defineResource

# Function: defineResource()

## Call Signature

```ts
function defineResource<T, TQuery, TRoutes>(config): ResourceObject<T, TQuery, TRoutes>;
```

Define a resource with typed REST client

Creates a resource object with:

- Typed client methods (fetchList, fetch, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select._, use._, get._, mutate._, cache._, storeApi._, events.\*)

### Type Parameters

#### T

`T` = `unknown`

Resource entity type (e.g., TestimonialPost)

#### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { search?: string })

#### TRoutes

`TRoutes` _extends_ [`ResourceRoutes`](../type-aliases/ResourceRoutes.md) = [`ResourceRoutes`](../type-aliases/ResourceRoutes.md)

### Parameters

#### config

[`ResourceConfig`](../type-aliases/ResourceConfig.md)<`T`, `TQuery`, `TRoutes`>

Resource configuration

### Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)<`T`, `TQuery`, `TRoutes`>

Resource object with client methods and metadata

### Throws

DeveloperError if configuration is invalid

## Call Signature

```ts
function defineResource<Config>(config): ResourceObject<InferResourceDefinition<Config>["entity"], InferResourceDefinition<Config>["query"], InferResourceDefinition<Config>["routes"]>;
```

Define a resource with typed REST client

Creates a resource object with:

- Typed client methods (fetchList, fetch, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select._, use._, get._, mutate._, cache._, storeApi._, events.\*)

### Type Parameters

#### Config

`Config` _extends_ [`ResourceConfig`](../type-aliases/ResourceConfig.md)<`unknown`, `unknown`, [`ResourceRoutes`](../type-aliases/ResourceRoutes.md)>

### Parameters

#### config

`ConfigWithInferredCapabilities`<`Config`>

Resource configuration

### Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)<`InferResourceDefinition`<`Config`>\[`"entity"`\], `InferResourceDefinition`<`Config`>\[`"query"`\], `InferResourceDefinition`<`Config`>\[`"routes"`\]>

Resource object with client methods and metadata

### Throws

DeveloperError if configuration is invalid
