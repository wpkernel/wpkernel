[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / ActionFn

# Type Alias: ActionFn&lt;TArgs, TResult&gt;

```ts
type ActionFn&lt;TArgs, TResult&gt; = (ctx, args) =&gt; Promise&lt;TResult&gt;;
```

Function signature for action implementations.

Actions are async functions that receive:
1. **Context** (`ctx`) - Integration surfaces (emit, invalidate, jobs, capability, reporter)
2. **Arguments** (`args`) - Input data provided by the caller

And return a Promise resolving to the action's result.

## Type Parameters

### TArgs

`TArgs`

Input type (arguments passed to the action)

### TResult

`TResult`

Return type (value returned by the action)

## Parameters

### ctx

[`ActionContext`](ActionContext.md)

### args

`TArgs`

## Returns

`Promise`&lt;`TResult`&gt;

## Example

```typescript
// Simple action
const CreatePost: ActionFn&lt;CreatePostInput, Post&gt; = async (ctx, input) =&gt; {
  const post = await api.posts.create(input);
  ctx.emit('post.created', { postId: post.id });
  ctx.invalidate(['posts']);
  return post;
};
```
