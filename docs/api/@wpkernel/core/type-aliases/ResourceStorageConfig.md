[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceStorageConfig

# Type Alias: ResourceStorageConfig

```ts
type ResourceStorageConfig = 
  | {
  mode: "transient";
}
  | {
  mode: "wp-post";
  meta?: Record&lt;string, ResourcePostMetaDescriptor&gt;;
  postType?: string;
  statuses?: string[];
  supports?: ("title" | "editor" | "excerpt" | "custom-fields")[];
  taxonomies?: Record&lt;string, {
     taxonomy: string;
     hierarchical?: boolean;
     register?: boolean;
  }&gt;;
}
  | {
  mode: "wp-taxonomy";
  taxonomy: string;
  hierarchical?: boolean;
}
  | {
  mode: "wp-option";
  option: string;
};
```

High-level storage configuration for CLI-driven persistence.

The runtime does not consume these properties directly; they exist so resource
definitions remain type-safe when enriched via generators.
