[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceQueryParams

# Type Alias: ResourceQueryParams

```ts
type ResourceQueryParams = Record&lt;string, ResourceQueryParamDescriptor&gt;;
```

Declarative map of supported query parameters for the resource.

Tooling uses this to derive REST argument schemas, filters, and documentation.
The runtime treats this as metadata and does not enforce it directly.
