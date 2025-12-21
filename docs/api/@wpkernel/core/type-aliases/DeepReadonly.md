[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / DeepReadonly

# Type Alias: DeepReadonly&lt;T&gt;

```ts
type DeepReadonly&lt;T&gt; = T extends (...args) =&gt; infer TResult ? (...args) =&gt; TResult : T extends object ? { readonly [Key in keyof T]: DeepReadonly&lt;T[Key]&gt; } : T;
```

Recursively marks an object as read-only.

The interactivity server state is treated as immutable. This helper mirrors
the WordPress runtime behaviour where any mutation is performed through data
layer dispatchers rather than manipulating the cached state directly.

## Type Parameters

### T

`T`
