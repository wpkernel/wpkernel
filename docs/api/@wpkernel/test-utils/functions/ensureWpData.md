[**@wpkernel/test-utils v0.12.6-beta.2**](../README.md)

***

[@wpkernel/test-utils](../README.md) / ensureWpData

# Function: ensureWpData()

```ts
function ensureWpData(): WordPressData;
```

Ensure `window.wp.data` exists and return it. Throws a WPKernelError
with actionable guidance if the Jest environment failed to initialise the
WordPress globals. This keeps individual suites from silently passing with an
`any`-typed fallback.

## Returns

[`WordPressData`](../type-aliases/WordPressData.md)
