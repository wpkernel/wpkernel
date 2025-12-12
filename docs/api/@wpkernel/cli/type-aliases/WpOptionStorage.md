[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / WpOptionStorage

# Type Alias: WpOptionStorage

```ts
type WpOptionStorage = Extract<NonNullable<IRResource["storage"]>, {
  mode: "wp-option";
}>;
```

WordPress Options storage configuration type.

Represents a resource storage configuration that uses WordPress's `wp_options`
table for persistence. Extracted from the IR resource storage union type.
