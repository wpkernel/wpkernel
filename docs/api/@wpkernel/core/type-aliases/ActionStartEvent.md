[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / ActionStartEvent

# Type Alias: ActionStartEvent

```ts
type ActionStartEvent = object & ActionLifecycleEventBase;
```

Lifecycle event emitted when an action starts execution.

Emitted immediately before the action function is invoked, enabling:
- Pre-execution hooks for logging or analytics
- Loading states in UI components
- Request correlation across distributed systems

Event name: `wpk.action.start`

## Type Declaration

### args

```ts
args: unknown;
```

### phase

```ts
phase: "start";
```
