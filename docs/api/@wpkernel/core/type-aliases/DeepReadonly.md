[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / DeepReadonly

# Type Alias: DeepReadonly<T>

```ts
type DeepReadonly<T> = T extends (...args) => infer TResult
	? (...args) => TResult
	: T extends object
		? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
		: T;
```

Recursively marks an object as read-only.

The interactivity server state is treated as immutable. This helper mirrors
the WordPress runtime behaviour where any mutation is performed through data
layer dispatchers rather than manipulating the cached state directly.

## Type Parameters

### T

`T`
