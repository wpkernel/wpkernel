[**@wpkernel/test-utils v0.12.6-beta.0**](../README.md)

***

[@wpkernel/test-utils](../README.md) / WordPressHarnessOverrides

# Interface: WordPressHarnessOverrides

Overrides for the WordPress test harness.

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
