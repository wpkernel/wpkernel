[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / createPhpWpOptionStorageHelper

# Function: createPhpWpOptionStorageHelper()

```ts
function createPhpWpOptionStorageHelper(): BuilderHelper;
```

Creates a PHP builder helper for WP Option storage.

This helper processes resources configured to use 'wp-option' storage mode
and populates the `ResourceStorageHelperState` with the necessary artifacts
for generating WP Option-based CRUD operations.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for WP Option storage.
