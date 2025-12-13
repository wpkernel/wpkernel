[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / createPhpBlocksHelper

# Function: createPhpBlocksHelper()

```ts
function createPhpBlocksHelper(): BuilderHelper;
```

Creates a PHP builder helper for generating WordPress blocks.

This helper processes block configurations from the IR, collects block manifests,
generates PHP artifacts for block registration, and stages render stubs for SSR blocks.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating PHP block code.
