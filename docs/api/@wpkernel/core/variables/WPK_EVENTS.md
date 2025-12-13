[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / WPK_EVENTS

# Variable: WPK_EVENTS

```ts
const WPK_EVENTS: object;
```

Public event names

WordPress hook event names that are part of the public API.
External code (plugins, themes) can listen to these events.

## Type Declaration

### ACTION_COMPLETE

```ts
readonly ACTION_COMPLETE: "wpk.action.complete";
```

### ACTION_ERROR

```ts
readonly ACTION_ERROR: "wpk.action.error";
```

### ACTION_START

```ts
readonly ACTION_START: "wpk.action.start";
```

Action lifecycle events

### CACHE_INVALIDATED

```ts
readonly CACHE_INVALIDATED: "wpk.cache.invalidated";
```

Cache invalidation events

### RESOURCE_ERROR

```ts
readonly RESOURCE_ERROR: "wpk.resource.error";
```

### RESOURCE_REQUEST

```ts
readonly RESOURCE_REQUEST: "wpk.resource.request";
```

Resource transport events

### RESOURCE_RESPONSE

```ts
readonly RESOURCE_RESPONSE: "wpk.resource.response";
```
