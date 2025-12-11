[**@wpkernel/ui v0.12.3-beta.1**](../README.md)

***

[@wpkernel/ui](../README.md) / Prefetcher

# Interface: Prefetcher&lt;TQuery&gt;

Interface for the prefetcher, which exposes stable cache prefetch helpers for a resource.

## Type Parameters

### TQuery

`TQuery` = `unknown`

## Properties

### prefetchGet

```ts
prefetchGet: PrefetchGet;
```

Prefetches a single item from the resource.

***

### prefetchList

```ts
prefetchList: PrefetchList&lt;TQuery&gt;;
```

Prefetches a list of items from the resource.
