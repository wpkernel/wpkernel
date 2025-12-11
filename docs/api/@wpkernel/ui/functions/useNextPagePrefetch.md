[**@wpkernel/ui v0.12.3-beta.1**](../README.md)

***

[@wpkernel/ui](../README.md) / useNextPagePrefetch

# Function: useNextPagePrefetch()

```ts
function useNextPagePrefetch&lt;TRecord, TQuery&gt;(
   resource, 
   currentQuery, 
   options): void;
```

Prefetches the next page of a paginated resource.

## Type Parameters

### TRecord

`TRecord`

### TQuery

`TQuery` *extends* `Record`&lt;`string`, `unknown`&gt;

## Parameters

### resource

`ResourceObject`&lt;`TRecord`, `TQuery`&gt;

The resource to prefetch.

### currentQuery

`TQuery`

The current query.

### options

[`NextPagePrefetchOptions`](../interfaces/NextPagePrefetchOptions.md)&lt;`TQuery`&gt; = `{}`

Options for the hook.

## Returns

`void`
