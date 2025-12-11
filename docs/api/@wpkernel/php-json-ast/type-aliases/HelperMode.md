[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / HelperMode

# Type Alias: HelperMode

```ts
type HelperMode = 'extend' | 'override' | 'merge';
```

Helper execution mode - determines how it integrates with existing helpers.

## Remarks

Currently only `extend` and `override` modes have implementation/validation logic.
The `merge` mode is reserved for future use.
