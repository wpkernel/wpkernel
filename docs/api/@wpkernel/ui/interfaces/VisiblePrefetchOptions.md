[**@wpkernel/ui v0.12.3-beta.1**](../README.md)

***

[@wpkernel/ui](../README.md) / VisiblePrefetchOptions

# Interface: VisiblePrefetchOptions

Options for the useVisiblePrefetch hook.

## Properties

### once?

```ts
optional once: boolean;
```

If true, the prefetch will only be triggered once.

#### Default

```ts
true
```

***

### rootMargin?

```ts
optional rootMargin: string;
```

The root margin for the IntersectionObserver.

#### See

https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin

#### Default

```ts
'200px'
```
