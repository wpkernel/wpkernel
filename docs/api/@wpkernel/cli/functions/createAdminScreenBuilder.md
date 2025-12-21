[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / createAdminScreenBuilder

# Function: createAdminScreenBuilder()

```ts
function createAdminScreenBuilder(): BuilderHelper;
```

Creates a helper for generating admin screen components from the IR.

Generated screens:
- Wrap content in `&lt;WPKernelScreen&gt;` using the resolved runtime.
- Stamp `data-wp-interactive` and `data-wp-context` for use with wp-interactivity.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)
