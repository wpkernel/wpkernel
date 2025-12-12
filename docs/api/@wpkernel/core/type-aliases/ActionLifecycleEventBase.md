[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ActionLifecycleEventBase

# Type Alias: ActionLifecycleEventBase

```ts
type ActionLifecycleEventBase = object;
```

Base metadata shared across all action lifecycle events.

This metadata is attached to every lifecycle event (start/complete/error) and
domain event emitted by actions, enabling:
- Request tracing and correlation
- Cross-tab event de-duplication
- PHP bridge integration
- Observability and debugging

## Properties

### actionName

```ts
actionName: string;
```

***

### bridged

```ts
bridged: boolean;
```

***

### namespace

```ts
namespace: string;
```

***

### requestId

```ts
requestId: string;
```

***

### scope

```ts
scope: "crossTab" | "tabLocal";
```

***

### timestamp

```ts
timestamp: number;
```
