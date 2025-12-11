[**@wpkernel/test-utils v0.12.3-beta.2**](../README.md)

***

[@wpkernel/test-utils](../README.md) / ApiFetchHarnessOptions

# Interface: ApiFetchHarnessOptions

Options for creating an `ApiFetchHarness`.

## Properties

### apiFetch?

```ts
optional apiFetch: any;
```

A mock `apiFetch` function.

***

### data?

```ts
optional data: Partial&lt;WordPressData&gt;;
```

Partial overrides for `window.wp.data`.

***

### hooks?

```ts
optional hooks: Partial&lt;any&gt;;
```

Partial overrides for `window.wp.hooks`.
