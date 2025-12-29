[**@wpkernel/ui v0.12.6-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / useHoverPrefetch

# Function: useHoverPrefetch()

```ts
function useHoverPrefetch(ref, fn, options): void;
```

Triggers a prefetch when the user hovers over an element.

## Parameters

### ref

`RefObject`<`HTMLElement`>

A React ref to the element to monitor.

### fn

() => `void`

The function to call to trigger the prefetch.

### options

[`HoverPrefetchOptions`](../interfaces/HoverPrefetchOptions.md) = `{}`

Options for the hook.

## Returns

`void`
