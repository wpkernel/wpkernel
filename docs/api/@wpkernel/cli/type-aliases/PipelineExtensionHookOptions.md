[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / PipelineExtensionHookOptions

# Type Alias: PipelineExtensionHookOptions

```ts
type PipelineExtensionHookOptions = CorePipelineExtensionHookOptions&lt;PipelineContext, PipelineRunOptions, IRv1&gt;;
```

Options passed to a pipeline extension hook.

Re-exports the core pipeline contract so extensions receive the full
`PipelineRunOptions` payload instead of the build-only subset.
