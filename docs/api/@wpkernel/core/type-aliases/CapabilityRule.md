[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityRule

# Type Alias: CapabilityRule<P>

```ts
type CapabilityRule<P> = (ctx, params) => boolean | Promise<boolean>;
```

Capability rule signature.

Rules can be synchronous (return boolean) or asynchronous (return Promise<boolean>).
Use async rules when checking capabilities requires REST API calls or async operations
(e.g., wp.data.select('core').canUser(), fetch() calls).

The capability runtime automatically caches async rule results to avoid redundant API calls.
Rules receive a CapabilityContext with adapters, cache, and reporter for structured evaluation.

## Type Parameters

### P

`P` = `void`

Parameters required by the rule. `void` indicates no params needed.

## Parameters

### ctx

[`CapabilityContext`](CapabilityContext.md)

### params

`P`

## Returns

`boolean` \| `Promise`<`boolean`>

## Example

```typescript
// Synchronous rule (no params)
const viewRule: CapabilityRule<void> = (ctx) => {
  return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
};

// Async rule with params
const editRule: CapabilityRule<number> = async (ctx, postId) => {
  const result = await ctx.adapters.wp?.canUser('update', {
    kind: 'postType',
    name: 'post',
    id: postId
  });
  return result ?? false;
};

// Complex params
const assignRule: CapabilityRule<{ userId: number; postId: number }> = async (ctx, params) => {
  const canEdit = await ctx.adapters.wp?.canUser('update', {
    kind: 'postType',
    name: 'post',
    id: params.postId
  });
  return canEdit && params.userId > 0;
};
```
