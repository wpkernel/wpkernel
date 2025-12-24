[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

***

[@wpkernel/cli](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook

```ts
type PipelineExtensionHook = (options) =&gt; Promise&lt;
  | PipelineExtensionHookResult
| void&gt;;
```

Represents a pipeline extension hook function.

## Parameters

### options

[`PipelineExtensionHookOptions`](PipelineExtensionHookOptions.md)

## Returns

`Promise`&lt;
  \| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)
  \| `void`&gt;
