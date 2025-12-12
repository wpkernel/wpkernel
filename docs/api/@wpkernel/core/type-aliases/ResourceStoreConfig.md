[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceStoreConfig

# Type Alias: ResourceStoreConfig&lt;T, TQuery&gt;

```ts
type ResourceStoreConfig&lt;T, TQuery&gt; = object & ResourceStoreOptions&lt;T, TQuery&gt;;
```

Store configuration for a resource.

## Type Declaration

### resource

```ts
resource: ResourceObject&lt;T, TQuery&gt;;
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
