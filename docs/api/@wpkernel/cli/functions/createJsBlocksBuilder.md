[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / createJsBlocksBuilder

# Function: createJsBlocksBuilder()

```ts
function createJsBlocksBuilder(): BuilderHelper;
```

Creates a builder helper for generating JavaScript-only WordPress blocks.

This helper processes block configurations from the IR, collects block manifests,
generates JavaScript artifacts for block registration, and stages render stubs
for blocks that do not have server-side rendering.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating JavaScript block code.
