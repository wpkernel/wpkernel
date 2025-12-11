[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ActionOptions

# Type Alias: ActionOptions

```ts
type ActionOptions = object;
```

Configuration options controlling action event propagation and bridging.

Actions can be configured to:

- Broadcast events across browser tabs (`scope: 'crossTab'`)
- Keep events local to the current tab (`scope: 'tabLocal'`)
- Bridge lifecycle events to PHP server (`bridged: true`)
- Skip PHP bridge for ephemeral UI actions (`bridged: false`)

## Example

```typescript
// Cross-tab action with PHP bridge (default for mutations)
defineAction({
	name: 'CreatePost',
	handler: impl,
	options: { scope: 'crossTab', bridged: true },
});

// Tab-local UI action (no PHP bridge)
defineAction({
	name: 'ToggleSidebar',
	handler: impl,
	options: { scope: 'tabLocal' }, // bridged=false automatically
});
```

## Properties

### bridged?

```ts
optional bridged: boolean;
```

Whether to bridge lifecycle events to PHP server. Ignored when scope is tabLocal.

---

### scope?

```ts
optional scope: "crossTab" | "tabLocal";
```

Event scope: whether events broadcast cross-tab or stay in current tab.
