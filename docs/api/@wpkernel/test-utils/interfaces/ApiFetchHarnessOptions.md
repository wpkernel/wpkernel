[**@wpkernel/test-utils v0.12.6-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ApiFetchHarnessOptions

# Interface: ApiFetchHarnessOptions

Options for creating an `ApiFetchHarness`.

## Properties

### apiFetch?

```ts
optional apiFetch: any;
```

A mock `apiFetch` function.

---

### data?

```ts
optional data: Partial<WordPressData>;
```

Partial overrides for `window.wp.data`.

---

### hooks?

```ts
optional hooks: Partial<any>;
```

Partial overrides for `window.wp.hooks`.
