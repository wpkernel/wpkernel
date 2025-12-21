[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceCapabilityMap

# Type Alias: ResourceCapabilityMap&lt;TRoutes&gt;

```ts
type ResourceCapabilityMap&lt;TRoutes&gt; = Partial&lt;Record&lt;RouteCapabilityKeys&lt;TRoutes&gt;, 
  | string
| ResourceCapabilityDescriptor&gt;&gt;;
```

Capability map for a resource.

Maps capability keys to WordPress capabilities. Values can be:
- String: Simple WordPress capability (e.g., 'edit_posts')
- Object: Detailed descriptor with appliesTo and optional binding

## Type Parameters

### TRoutes

`TRoutes` *extends* [`ResourceRoutes`](ResourceRoutes.md) = [`ResourceRoutes`](ResourceRoutes.md)
