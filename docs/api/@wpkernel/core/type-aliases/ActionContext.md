[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / ActionContext

# Type Alias: ActionContext

```ts
type ActionContext = object;
```

Primary API surface passed to action implementations.

The ActionContext provides actions with all the integration points they need:
- Event emission for domain events
- Cache invalidation for resource stores
- Background job scheduling
- Authorization checks
- Structured logging
- Identity metadata (requestId, namespace)

This is the second parameter to every action function.

## Example

```typescript
async function CreatePost(ctx: ActionContext, input: CreatePostInput) {
  // Authorization
  ctx.capability.assert('edit_posts');

  // Logging
  ctx.reporter.info('Creating post', { input });

  // Resource mutation
  const post = await api.posts.create(input);

  // Domain event
  ctx.emit('post.created', { postId: post.id });

  // Cache invalidation
  ctx.invalidate(['posts', `post:${post.id}`]);

  // Background job
  await ctx.jobs.enqueue('email.notification', { postId: post.id });

  return post;
}
```

## Properties

### capability

```ts
readonly capability: Pick&lt;CapabilityHelpers&lt;Record&lt;string, unknown&gt;&gt;, "assert" | "can"&gt;;
```

Capability enforcement helpers.

***

### emit()

```ts
emit: (eventName, payload) =&gt; void;
```

Emit canonical events.

#### Parameters

##### eventName

`string`

##### payload

`unknown`

#### Returns

`void`

***

### invalidate()

```ts
invalidate: (patterns, options?) =&gt; void;
```

Invalidate cache keys.

#### Parameters

##### patterns

[`CacheKeyPattern`](CacheKeyPattern.md) | [`CacheKeyPattern`](CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](InvalidateOptions.md)

#### Returns

`void`

***

### jobs

```ts
readonly jobs: ActionJobs;
```

Background job helpers.

***

### namespace

```ts
readonly namespace: string;
```

Resolved namespace of the current action.

***

### reporter

```ts
readonly reporter: Reporter;
```

Structured logging surface.

***

### requestId

```ts
readonly requestId: string;
```

Correlation identifier shared with transport calls.
