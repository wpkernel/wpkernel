[**@wpkernel/ui v0.12.5-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / useNextPagePrefetch

# Function: useNextPagePrefetch()

```ts
function useNextPagePrefetch<TRecord, TQuery>(
   resource,
   currentQuery,
   options): void;
```

Prefetches the next page of a paginated resource.

## Type Parameters

### TRecord

`TRecord`

### TQuery

`TQuery` _extends_ `Record`<`string`, `unknown`>

## Parameters

### resource

`ResourceObject`<`TRecord`, `TQuery`>

The resource to prefetch.

### currentQuery

`TQuery`

The current query.

### options

[`NextPagePrefetchOptions`](../interfaces/NextPagePrefetchOptions.md)<`TQuery`> = `{}`

Options for the hook.

## Returns

`void`
