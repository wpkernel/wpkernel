[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / WpOptionStorage

# Type Alias: WpOptionStorage

```ts
type WpOptionStorage = Extract&lt;NonNullable&lt;IRResource["storage"]&gt;, {
  mode: "wp-option";
}&gt;;
```

WordPress Options storage configuration type.

Represents a resource storage configuration that uses WordPress's `wp_options`
table for persistence. Extracted from the IR resource storage union type.
