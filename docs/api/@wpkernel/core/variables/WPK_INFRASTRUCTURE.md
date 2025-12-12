[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / WPK\_INFRASTRUCTURE

# Variable: WPK\_INFRASTRUCTURE

```ts
const WPK_INFRASTRUCTURE: object;
```

Framework infrastructure constants

Keys used for browser APIs (storage, channels), WordPress hooks, and public event names.

## Type Declaration

### ACTIONS\_CHANNEL

```ts
readonly ACTIONS_CHANNEL: "wpk.actions";
```

BroadcastChannel name for action lifecycle events

### ACTIONS\_MESSAGE\_TYPE\_EVENT

```ts
readonly ACTIONS_MESSAGE_TYPE_EVENT: "wpk.action.event";
```

BroadcastChannel message type for action custom events

### ACTIONS\_MESSAGE\_TYPE\_LIFECYCLE

```ts
readonly ACTIONS_MESSAGE_TYPE_LIFECYCLE: "wpk.action.lifecycle";
```

BroadcastChannel message type for action lifecycle events

### CAPABILITY\_CACHE\_CHANNEL

```ts
readonly CAPABILITY_CACHE_CHANNEL: "wpk.capability.cache";
```

BroadcastChannel name for capability cache sync

### CAPABILITY\_CACHE\_STORAGE

```ts
readonly CAPABILITY_CACHE_STORAGE: "wpk.capability.cache";
```

Storage key prefix for capability cache

### CAPABILITY\_EVENT\_CHANNEL

```ts
readonly CAPABILITY_EVENT_CHANNEL: "wpk.capability.events";
```

BroadcastChannel name for capability events

### WP\_HOOKS\_NAMESPACE\_PREFIX

```ts
readonly WP_HOOKS_NAMESPACE_PREFIX: "wpk/notices";
```

WordPress hooks namespace prefix for WPKernel events plugin

### WP\_HOOKS\_NAMESPACE\_UI\_DATAVIEWS

```ts
readonly WP_HOOKS_NAMESPACE_UI_DATAVIEWS: "wpk/ui/dataviews";
```

WordPress hooks namespace for UI DataViews bridge (default base)
