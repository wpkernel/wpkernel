[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / createPhpPluginLoaderHelper

# Function: createPhpPluginLoaderHelper()

```ts
function createPhpPluginLoaderHelper(): BuilderHelper;
```

Creates a PHP builder helper for generating the main plugin loader file (`plugin.php`).

This helper generates the primary entry point for the WordPress plugin,
which includes and initializes all other generated PHP components.
It also checks for an existing `plugin.php` to avoid overwriting user-owned files.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating the plugin loader file.
