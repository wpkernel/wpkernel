[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / createApplyPlanBuilder

# Function: createApplyPlanBuilder()

```ts
function createApplyPlanBuilder(): BuilderHelper;
```

Creates a builder helper for generating an apply plan.

This helper analyzes the differences between the current generation state
and the desired state (based on the IR) and creates a plan of actions
(writes, deletions) to bring the workspace up to date. This plan is then
used by the `createPatcher` helper.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating the apply plan.
