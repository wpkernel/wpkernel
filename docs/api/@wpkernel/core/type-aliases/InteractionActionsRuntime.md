[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / InteractionActionsRuntime

# Type Alias: InteractionActionsRuntime<TActions>

```ts
type InteractionActionsRuntime<TActions> = { [Key in keyof TActions]: TActions[Key] extends InteractionActionInput<infer TArgs, infer TResult> ? (args: TArgs) => Promise<TResult> : never };
```

Runtime representation of bound interaction actions.

## Type Parameters

### TActions

`TActions` _extends_ [`InteractionActionsRecord`](InteractionActionsRecord.md)
