[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / WPK\_EVENTS

# Variable: WPK\_EVENTS

```ts
const WPK_EVENTS: object;
```

Public event names

WordPress hook event names that are part of the public API.
External code (plugins, themes) can listen to these events.

## Type Declaration

### ACTION\_COMPLETE

```ts
readonly ACTION_COMPLETE: "wpk.action.complete";
```

### ACTION\_ERROR

```ts
readonly ACTION_ERROR: "wpk.action.error";
```

### ACTION\_START

```ts
readonly ACTION_START: "wpk.action.start";
```

Action lifecycle events

### CACHE\_INVALIDATED

```ts
readonly CACHE_INVALIDATED: "wpk.cache.invalidated";
```

Cache invalidation events

### RESOURCE\_ERROR

```ts
readonly RESOURCE_ERROR: "wpk.resource.error";
```

### RESOURCE\_REQUEST

```ts
readonly RESOURCE_REQUEST: "wpk.resource.request";
```

Resource transport events

### RESOURCE\_RESPONSE

```ts
readonly RESOURCE_RESPONSE: "wpk.resource.response";
```
