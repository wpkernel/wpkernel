[**@wpkernel/wp-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ensureStorage

# Function: ensureStorage()

```ts
function ensureStorage(resource): object;
```

Ensures the resource is configured with `wp-post` storage.

## Parameters

### resource

[`MutationHelperResource`](../interfaces/MutationHelperResource.md)

## Returns

`object`

### mode

```ts
mode: "wp-post";
```

### meta?

```ts
optional meta: Record&lt;string, ResourcePostMetaDescriptor&gt;;
```

### postType?

```ts
optional postType: string;
```

### statuses?

```ts
optional statuses: string[];
```

### supports?

```ts
optional supports: ("title" | "editor" | "excerpt" | "custom-fields")[];
```

### taxonomies?

```ts
optional taxonomies: Record&lt;string, {
  taxonomy: string;
  hierarchical?: boolean;
  register?: boolean;
}&gt;;
```

## Throws

WPKernelError when storage is missing or not wp-post.
