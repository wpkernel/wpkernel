[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceStoreConfig

# Type Alias: ResourceStoreConfig<T, TQuery>

```ts
type ResourceStoreConfig<T, TQuery> = object & ResourceStoreOptions<T, TQuery>;
```

Store configuration for a resource.

## Type Declaration

### resource

```ts
resource: ResourceObject & lt;
(T, TQuery & gt);
```

The resource object this store is for.

### reporter?

```ts
optional reporter: Reporter;
```

Reporter instance used for store instrumentation.

## Type Parameters

### T

`T`

The resource entity type

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations
