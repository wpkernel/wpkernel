[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceIdentityConfig

# Type Alias: ResourceIdentityConfig

```ts
type ResourceIdentityConfig = 
  | {
  type: "number";
  param?: "id";
}
  | {
  type: "string";
  param?: "id" | "slug" | "uuid";
};
```

Identifier configuration for CLI-generated helpers.

Runtime ignores this by default but accepts the fields so configs remain compatible.
