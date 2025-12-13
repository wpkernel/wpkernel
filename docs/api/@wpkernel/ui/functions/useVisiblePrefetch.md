[**@wpkernel/ui v0.12.5-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / useVisiblePrefetch

# Function: useVisiblePrefetch()

```ts
function useVisiblePrefetch(ref, fn, options): void;
```

Triggers a prefetch when an element becomes visible in the viewport.

This hook uses `IntersectionObserver` if available, otherwise it falls back to
a scroll and resize listener.

## Parameters

### ref

`RefObject`<`Element`>

A React ref to the element to monitor.

### fn

() => `void`

The function to call to trigger the prefetch.

### options

[`VisiblePrefetchOptions`](../interfaces/VisiblePrefetchOptions.md) = `{}`

Options for the hook.

## Returns

`void`
