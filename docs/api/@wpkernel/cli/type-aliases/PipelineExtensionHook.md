[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook

```ts
type PipelineExtensionHook = (options) => Promise<
  | PipelineExtensionHookResult
| void>;
```

Represents a pipeline extension hook function.

## Parameters

### options

[`PipelineExtensionHookOptions`](PipelineExtensionHookOptions.md)

## Returns

`Promise`<
\| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)
\| `void`>
