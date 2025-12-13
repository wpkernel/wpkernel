[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ActionErrorEvent

# Type Alias: ActionErrorEvent

```ts
type ActionErrorEvent = object & ActionLifecycleEventBase;
```

Lifecycle event emitted when an action fails.

Emitted when the action function throws an error, enabling:

- Error notifications and reporting
- Retry logic and fallback behavior
- Error tracking in observability tools

Event name: `wpk.action.error`

## Type Declaration

### durationMs

```ts
durationMs: number;
```

### error

```ts
error: unknown;
```

### phase

```ts
phase: 'error';
```
