[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceCapabilityMap

# Type Alias: ResourceCapabilityMap<TRoutes>

```ts
type ResourceCapabilityMap<TRoutes> = Partial<Record<RouteCapabilityKeys<TRoutes>,
  | string
| ResourceCapabilityDescriptor>>;
```

Capability map for a resource.

Maps capability keys to WordPress capabilities. Values can be:

- String: Simple WordPress capability (e.g., 'edit_posts')
- Object: Detailed descriptor with appliesTo and optional binding

## Type Parameters

### TRoutes

`TRoutes` _extends_ [`ResourceRoutes`](ResourceRoutes.md) = [`ResourceRoutes`](ResourceRoutes.md)
