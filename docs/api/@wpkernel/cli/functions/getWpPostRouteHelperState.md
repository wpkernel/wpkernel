[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / getWpPostRouteHelperState

# Function: getWpPostRouteHelperState()

```ts
function getWpPostRouteHelperState(context): WpPostRouteHelperState;
```

Retrieves the singleton state object for the WP Post route helper from the pipeline context.

If the state object does not exist in the context, it is initialized.

## Parameters

### context

[`PipelineContext`](../interfaces/PipelineContext.md)

The current pipeline context.

## Returns

[`WpPostRouteHelperState`](../interfaces/WpPostRouteHelperState.md)

The `WpPostRouteHelperState` instance.
