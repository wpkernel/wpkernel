[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityProxyOptions

# Type Alias: CapabilityProxyOptions

```ts
type CapabilityProxyOptions = object;
```

Options for creating a capability proxy, containing action metadata.

This type defines the metadata associated with an action that is passed to the
capability proxy for context propagation and event correlation.

## Properties

### actionName

```ts
actionName: string;
```

---

### bridged

```ts
bridged: boolean;
```

---

### namespace

```ts
namespace: string;
```

---

### requestId

```ts
requestId: string;
```

---

### scope

```ts
scope: 'crossTab' | 'tabLocal';
```
