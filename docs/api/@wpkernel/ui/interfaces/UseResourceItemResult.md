[**@wpkernel/ui v0.12.6-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / UseResourceItemResult

# Interface: UseResourceItemResult<T>

Result shape for single-item resource hooks

## Type Parameters

### T

`T`

Entity type returned by the resource

## Properties

### data

```ts
data: T | undefined;
```

The fetched entity, or undefined if not yet loaded

---

### error

```ts
error: string | undefined;
```

Error message if the fetch failed, undefined otherwise

---

### isLoading

```ts
isLoading: boolean;
```

True if the data is currently being fetched or resolved
