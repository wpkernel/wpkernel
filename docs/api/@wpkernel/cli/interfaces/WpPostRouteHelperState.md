[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / WpPostRouteHelperState

# Interface: WpPostRouteHelperState

Represents the state managed by the WP Post route helper.

This state stores bundles of generated artifacts for WP Post-based routes,
keyed by resource name.

## Properties

### bundles

```ts
readonly bundles: Map&lt;string, WpPostRouteBundle&gt;;
```

A map of resource names to their WP Post route bundles.
