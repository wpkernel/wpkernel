[**@wpkernel/ui v0.12.6-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / NextPagePrefetchOptions

# Interface: NextPagePrefetchOptions<TQuery>

Options for the useNextPagePrefetch hook.

## Type Parameters

### TQuery

`TQuery`

## Properties

### computeNext()?

```ts
optional computeNext: (query) => TQuery;
```

A function that computes the next query to prefetch.

#### Parameters

##### query

`TQuery`

The current query.

#### Returns

`TQuery`

The next query to prefetch.

---

### when?

```ts
optional when: boolean;
```

If true, the prefetch will be triggered.

#### Default

```ts
true;
```
