[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / CapabilityRule

# Type Alias: CapabilityRule&lt;P&gt;

```ts
type CapabilityRule&lt;P&gt; = (ctx, params) =&gt; boolean | Promise&lt;boolean&gt;;
```

Capability rule signature.

Rules can be synchronous (return boolean) or asynchronous (return Promise&lt;boolean&gt;).
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

`boolean` \| `Promise`&lt;`boolean`&gt;

## Example

```typescript
// Synchronous rule (no params)
const viewRule: CapabilityRule&lt;void&gt; = (ctx) =&gt; {
  return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
};

// Async rule with params
const editRule: CapabilityRule&lt;number&gt; = async (ctx, postId) =&gt; {
  const result = await ctx.adapters.wp?.canUser('update', {
    kind: 'postType',
    name: 'post',
    id: postId
  });
  return result ?? false;
};

// Complex params
const assignRule: CapabilityRule&lt;{ userId: number; postId: number }&gt; = async (ctx, params) =&gt; {
  const canEdit = await ctx.adapters.wp?.canUser('update', {
    kind: 'postType',
    name: 'post',
    id: params.postId
  });
  return canEdit && params.userId &gt; 0;
};
```
