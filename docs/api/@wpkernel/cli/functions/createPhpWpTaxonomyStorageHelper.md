[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / createPhpWpTaxonomyStorageHelper

# Function: createPhpWpTaxonomyStorageHelper()

```ts
function createPhpWpTaxonomyStorageHelper(): BuilderHelper;
```

Creates a PHP builder helper for WP Taxonomy storage.

This helper processes resources configured to use 'wp-taxonomy' storage mode
and populates the `ResourceStorageHelperState` with the necessary artifacts
for generating WP Taxonomy-based CRUD operations.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for WP Taxonomy storage.
