[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / ActionCompleteEvent

# Type Alias: ActionCompleteEvent

```ts
type ActionCompleteEvent = object & ActionLifecycleEventBase;
```

Lifecycle event emitted when an action completes successfully.

Emitted after the action function returns, enabling:
- Success notifications and toasts
- Performance monitoring and metrics
- Post-execution hooks for analytics

Event name: `wpk.action.complete`

## Type Declaration

### durationMs

```ts
durationMs: number;
```

### phase

```ts
phase: "complete";
```

### result

```ts
result: unknown;
```
