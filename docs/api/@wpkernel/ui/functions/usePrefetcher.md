[**@wpkernel/ui v0.12.5-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / usePrefetcher

# Function: usePrefetcher()

```ts
function usePrefetcher<TRecord, TQuery>(resource): Prefetcher<TQuery>;
```

Exposes stable cache prefetch helpers for a resource.

Wraps the wpk resource's `prefetchGet` and `prefetchList` helpers so React
components can wire them to UI affordances (hover, visibility, etc.) without
re-creating callback instances on every render.

## Type Parameters

### TRecord

`TRecord`

### TQuery

`TQuery` = `unknown`

## Parameters

### resource

`ResourceObject`<`TRecord`, `TQuery`>

Kernel resource exposing optional prefetch helpers.

## Returns

[`Prefetcher`](../interfaces/Prefetcher.md)<`TQuery`>
