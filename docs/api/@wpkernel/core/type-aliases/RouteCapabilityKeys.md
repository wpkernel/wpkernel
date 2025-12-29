[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / RouteCapabilityKeys

# Type Alias: RouteCapabilityKeys<TRoutes>

```ts
type RouteCapabilityKeys<TRoutes> = Extract<
	{
		[TKey in keyof TRoutes]: ExtractRouteCapability<
			NonNullable<TRoutes[TKey]>
		>;
	}[keyof TRoutes],
	string
>;
```

Capability keys referenced across all configured routes.

## Type Parameters

### TRoutes

`TRoutes`
