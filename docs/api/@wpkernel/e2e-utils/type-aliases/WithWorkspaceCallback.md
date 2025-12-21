[**@wpkernel/e2e-utils v0.12.6-beta.3**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / WithWorkspaceCallback

# Type Alias: WithWorkspaceCallback&lt;TResult&gt;

```ts
type WithWorkspaceCallback&lt;TResult&gt; = (workspace) =&gt; Promise&lt;TResult&gt; | TResult;
```

Callback executed with an isolated workspace instance.

## Type Parameters

### TResult

`TResult`

## Parameters

### workspace

[`IsolatedWorkspace`](../interfaces/IsolatedWorkspace.md)

## Returns

`Promise`&lt;`TResult`&gt; \| `TResult`
