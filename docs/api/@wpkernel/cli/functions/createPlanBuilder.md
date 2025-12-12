[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / createPlanBuilder

# Function: createPlanBuilder()

```ts
function createPlanBuilder(): BuilderHelper;
```

Creates a builder helper for generating a plan during `generate`.

This helper is side-effect free beyond writing the plan manifest. It does
not invoke the patcher or mutate userland files.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating the plan manifest.
