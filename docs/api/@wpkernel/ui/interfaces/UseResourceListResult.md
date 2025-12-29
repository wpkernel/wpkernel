[**@wpkernel/ui v0.12.6-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / UseResourceListResult

# Interface: UseResourceListResult<T>

Result shape for list resource hooks

## Type Parameters

### T

`T`

Entity type in the list

## Properties

### data

```ts
data: ListResponse<T> | undefined;
```

The fetched list response with items and metadata, or undefined if not yet loaded

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
