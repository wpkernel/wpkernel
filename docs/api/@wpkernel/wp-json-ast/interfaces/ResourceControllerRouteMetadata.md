[**@wpkernel/wp-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ResourceControllerRouteMetadata

# Interface: ResourceControllerRouteMetadata

Metadata for a resource controller route.

## See

ResourceControllerMetadata

## Properties

### kind

```ts
readonly kind: "list" | "get" | "create" | "update" | "remove" | "custom";
```

The kind of route.

***

### method

```ts
readonly method: string;
```

The HTTP method for the route.

***

### path

```ts
readonly path: string;
```

The path for the route.

***

### cacheSegments?

```ts
readonly optional cacheSegments: readonly unknown[];
```

Optional cache segments for the route.

***

### tags?

```ts
readonly optional tags: Readonly&lt;Record&lt;string, string&gt;&gt;;
```

Optional tags for the route.
