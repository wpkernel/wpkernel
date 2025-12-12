[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / createPatcher

# Function: createPatcher()

```ts
function createPatcher(): BuilderHelper;
```

Creates a builder helper for applying patches to the workspace.

This helper reads a patch plan, applies file modifications (writes, merges, deletions)
based on the plan, and records the outcome in a patch manifest.
It uses `git merge-file` for intelligent three-way merges to handle conflicts.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for applying patches.
