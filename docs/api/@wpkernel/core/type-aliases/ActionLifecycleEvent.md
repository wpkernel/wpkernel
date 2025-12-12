[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ActionLifecycleEvent

# Type Alias: ActionLifecycleEvent

```ts
type ActionLifecycleEvent =
	| ActionStartEvent
	| ActionCompleteEvent
	| ActionErrorEvent;
```

Union type of all lifecycle events emitted by actions.

Actions emit three lifecycle phases:

- `start` - Before action execution begins
- `complete` - After successful execution
- `error` - After execution fails

Observers can listen to these events via:

- WordPress hooks (`wp.hooks.addAction('wpk.action.start', handler)`)
- PHP bridge (`add_action('wpk.action.start', 'my_handler')`)
- BroadcastChannel (for cross-tab coordination)
