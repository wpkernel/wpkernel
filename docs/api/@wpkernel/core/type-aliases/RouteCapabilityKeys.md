[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / RouteCapabilityKeys

# Type Alias: RouteCapabilityKeys&lt;TRoutes&gt;

```ts
type RouteCapabilityKeys&lt;TRoutes&gt; = Extract&lt;{ [TKey in keyof TRoutes]: ExtractRouteCapability&lt;NonNullable&lt;TRoutes[TKey]&gt;&gt; }[keyof TRoutes], string&gt;;
```

Capability keys referenced across all configured routes.

## Type Parameters

### TRoutes

`TRoutes`
