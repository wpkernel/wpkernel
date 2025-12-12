[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ResourceControllerMetadata

# Type Alias: ResourceControllerMetadata

```ts
type ResourceControllerMetadata = BasePhpFileMetadata & object;
```

Metadata for a resource controller.

## Type Declaration

### identity

```ts
readonly identity: object;
```

The identity of the resource.

#### identity.param

```ts
readonly param: string;
```

The name of the identity parameter.

#### identity.type

```ts
readonly type: "number" | "string";
```

The type of the identity.

### kind

```ts
readonly kind: "resource-controller";
```

The kind of metadata.

### name

```ts
readonly name: string;
```

The name of the resource.

### routes

```ts
readonly routes: readonly ResourceControllerRouteMetadata[];
```

The routes for the resource.

### cache?

```ts
readonly optional cache: ResourceControllerCacheMetadata;
```

Optional cache metadata for the resource.

### helpers?

```ts
readonly optional helpers: ResourceControllerHelperMetadata;
```

Optional helper metadata for the resource.
