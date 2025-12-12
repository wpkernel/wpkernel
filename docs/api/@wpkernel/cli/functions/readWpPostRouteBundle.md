[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / readWpPostRouteBundle

# Function: readWpPostRouteBundle()

```ts
function readWpPostRouteBundle(
	state,
	resourceName
): WpPostRouteBundle | undefined;
```

Reads a WP Post route bundle for a given resource name from the helper state.

## Parameters

### state

[`WpPostRouteHelperState`](../interfaces/WpPostRouteHelperState.md)

The `WpPostRouteHelperState` containing the bundles.

### resourceName

`string`

The name of the resource to retrieve the bundle for.

## Returns

`WpPostRouteBundle` \| `undefined`

The `WpPostRouteBundle` for the specified resource, or `undefined` if not found.
