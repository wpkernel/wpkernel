[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / WPK\_NAMESPACE

# Variable: WPK\_NAMESPACE

```ts
const WPK_NAMESPACE: "wpk" = 'wpk';
```

Root framework namespace

This is the canonical namespace for the WPKernel framework.
Used as:
- Default reporter namespace when no plugin namespace detected
- Fallback in getNamespace() detection cascade
- Prefix for framework public APIs (events, hooks, storage)
