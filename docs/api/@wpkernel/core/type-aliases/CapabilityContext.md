[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / CapabilityContext

# Type Alias: CapabilityContext

```ts
type CapabilityContext = object;
```

Capability evaluation context passed to every rule.

The context provides adapters for capability checking, cache for result storage,
reporter for logging, and namespace for event naming. Rules receive this as their
first parameter and use it to make capability decisions.

## Example

```typescript
const rule: CapabilityRule&lt;number&gt; = async (ctx, postId) =&gt; {
  // Log evaluation
  ctx.reporter?.debug('Checking edit capability', { postId });

  // Check cached result first
  const cacheKey = `posts.edit::${postId}`;
  const cached = ctx.cache.get(cacheKey);
  if (typeof cached === 'boolean') {
    ctx.reporter?.debug('Cache hit', { result: cached });
    return cached;
  }

  // Use adapter for capability check
  const result = await ctx.adapters.wp?.canUser('update', {
    kind: 'postType',
    name: 'post',
    id: postId
  }) ?? false;

  ctx.reporter?.info('Capability checked', { postId, result });
  return result;
};
```

## Properties

### adapters

```ts
adapters: CapabilityAdapters;
```

***

### cache

```ts
cache: CapabilityCache;
```

***

### namespace

```ts
namespace: string;
```

***

### reporter?

```ts
optional reporter: CapabilityReporter;
```
