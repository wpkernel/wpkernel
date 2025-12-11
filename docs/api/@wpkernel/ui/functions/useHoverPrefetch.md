[**@wpkernel/ui v0.12.3-beta.1**](../README.md)

***

[@wpkernel/ui](../README.md) / useHoverPrefetch

# Function: useHoverPrefetch()

```ts
function useHoverPrefetch(
   ref, 
   fn, 
   options): void;
```

Triggers a prefetch when the user hovers over an element.

## Parameters

### ref

`RefObject`&lt;`HTMLElement`&gt;

A React ref to the element to monitor.

### fn

() =&gt; `void`

The function to call to trigger the prefetch.

### options

[`HoverPrefetchOptions`](../interfaces/HoverPrefetchOptions.md) = `{}`

Options for the hook.

## Returns

`void`
