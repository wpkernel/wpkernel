[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / InteractionActionsRuntime

# Type Alias: InteractionActionsRuntime&lt;TActions&gt;

```ts
type InteractionActionsRuntime&lt;TActions&gt; = { [Key in keyof TActions]: TActions[Key] extends InteractionActionInput&lt;infer TArgs, infer TResult&gt; ? (args: TArgs) =&gt; Promise&lt;TResult&gt; : never };
```

Runtime representation of bound interaction actions.

## Type Parameters

### TActions

`TActions` *extends* [`InteractionActionsRecord`](InteractionActionsRecord.md)
