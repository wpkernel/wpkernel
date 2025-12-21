[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / CapabilityDeniedEvent

# Type Alias: CapabilityDeniedEvent

```ts
type CapabilityDeniedEvent = object;
```

Payload emitted with `{namespace}.capability.denied` events.

## Properties

### capabilityKey

```ts
capabilityKey: string;
```

***

### timestamp

```ts
timestamp: number;
```

***

### context?

```ts
optional context: Record&lt;string, unknown&gt;;
```

***

### messageKey?

```ts
optional messageKey: string;
```

***

### reason?

```ts
optional reason: string;
```

***

### requestId?

```ts
optional requestId: string;
```
