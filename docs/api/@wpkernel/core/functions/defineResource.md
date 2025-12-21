[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / defineResource

# Function: defineResource()

## Call Signature

```ts
function defineResource&lt;T, TQuery, TRoutes&gt;(config): ResourceObject&lt;T, TQuery, TRoutes&gt;;
```

Define a resource with typed REST client

Creates a resource object with:
- Typed client methods (fetchList, fetch, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select.*, use.*, get.*, mutate.*, cache.*, storeApi.*, events.*)

### Type Parameters

#### T

`T` = `unknown`

Resource entity type (e.g., TestimonialPost)

#### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { search?: string })

#### TRoutes

`TRoutes` *extends* [`ResourceRoutes`](../type-aliases/ResourceRoutes.md) = [`ResourceRoutes`](../type-aliases/ResourceRoutes.md)

### Parameters

#### config

[`ResourceConfig`](../type-aliases/ResourceConfig.md)&lt;`T`, `TQuery`, `TRoutes`&gt;

Resource configuration

### Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)&lt;`T`, `TQuery`, `TRoutes`&gt;

Resource object with client methods and metadata

### Throws

DeveloperError if configuration is invalid

## Call Signature

```ts
function defineResource&lt;Config&gt;(config): ResourceObject&lt;InferResourceDefinition&lt;Config&gt;["entity"], InferResourceDefinition&lt;Config&gt;["query"], InferResourceDefinition&lt;Config&gt;["routes"]&gt;;
```

Define a resource with typed REST client

Creates a resource object with:
- Typed client methods (fetchList, fetch, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select.*, use.*, get.*, mutate.*, cache.*, storeApi.*, events.*)

### Type Parameters

#### Config

`Config` *extends* [`ResourceConfig`](../type-aliases/ResourceConfig.md)&lt;`unknown`, `unknown`, [`ResourceRoutes`](../type-aliases/ResourceRoutes.md)&gt;

### Parameters

#### config

`ConfigWithInferredCapabilities`&lt;`Config`&gt;

Resource configuration

### Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)&lt;`InferResourceDefinition`&lt;`Config`&gt;\[`"entity"`\], `InferResourceDefinition`&lt;`Config`&gt;\[`"query"`\], `InferResourceDefinition`&lt;`Config`&gt;\[`"routes"`\]&gt;

Resource object with client methods and metadata

### Throws

DeveloperError if configuration is invalid
