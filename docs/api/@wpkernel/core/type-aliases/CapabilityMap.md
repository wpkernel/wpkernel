[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / CapabilityMap

# Type Alias: CapabilityMap&lt;Keys&gt;

```ts
type CapabilityMap&lt;Keys&gt; = { [K in keyof Keys]: CapabilityRule&lt;Keys[K]&gt; };
```

Mapping from capability key to rule implementation.

## Type Parameters

### Keys

`Keys` *extends* `Record`&lt;`string`, `unknown`&gt;
