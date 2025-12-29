[**@wpkernel/test-utils v0.12.6-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / WithWordPressDataOptions

# Interface: WithWordPressDataOptions

Options for the `withWordPressData` helper.

## Properties

### apiFetch?

```ts
optional apiFetch: any;
```

Optional `wp.apiFetch` override. Set to `null` to unset.

---

### data?

```ts
optional data: Partial<WordPressData> | null;
```

Optional `wp.data` override. Set to `null` to unset.

---

### hooks?

```ts
optional hooks: Partial<any> | null;
```

Optional `wp.hooks` override. Set to `null` to unset.

---

### wp?

```ts
optional wp: any;
```

Optional `wp` global override. Set to `null` to unset.
