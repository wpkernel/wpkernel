[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / WithWorkspaceCallback

# Type Alias: WithWorkspaceCallback<TResult>

```ts
type WithWorkspaceCallback<TResult> = (workspace) => Promise<TResult> | TResult;
```

Callback executed with an isolated workspace instance.

## Type Parameters

### TResult

`TResult`

## Parameters

### workspace

[`IsolatedWorkspace`](../interfaces/IsolatedWorkspace.md)

## Returns

`Promise`<`TResult`> \| `TResult`
