[**@wpkernel/pipeline v0.12.3-beta.2**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineExtensionLifecycle

# Type Alias: PipelineExtensionLifecycle

```ts
type PipelineExtensionLifecycle = 
  | "prepare"
  | "before-fragments"
  | "after-fragments"
  | "before-builders"
  | "after-builders"
  | "finalize"
  | string & object;
```

Options passed to pipeline extension hooks.
