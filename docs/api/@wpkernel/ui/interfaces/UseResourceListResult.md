[**@wpkernel/ui v0.12.4-beta.0**](../README.md)

***

[@wpkernel/ui](../README.md) / UseResourceListResult

# Interface: UseResourceListResult&lt;T&gt;

Result shape for list resource hooks

## Type Parameters

### T

`T`

Entity type in the list

## Properties

### data

```ts
data: ListResponse&lt;T&gt; | undefined;
```

The fetched list response with items and metadata, or undefined if not yet loaded

***

### error

```ts
error: string | undefined;
```

Error message if the fetch failed, undefined otherwise

***

### isLoading

```ts
isLoading: boolean;
```

True if the data is currently being fetched or resolved
