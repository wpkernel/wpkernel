[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / createPhpIndexFileHelper

# Function: createPhpIndexFileHelper()

```ts
function createPhpIndexFileHelper(): BuilderHelper;
```

Creates a PHP builder helper for generating the main `index.php` file.

This helper generates the primary entry point for the generated PHP code,
which includes and initializes all other generated components like controllers,
capabilities, and the persistence registry.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating the `index.php` file.
