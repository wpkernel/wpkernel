[**@wpkernel/pipeline v0.12.6-beta.0**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook&lt;TContext, TOptions, TArtifact&gt;

```ts
type PipelineExtensionHook&lt;TContext, TOptions, TArtifact&gt; = (options) =&gt; MaybePromise&lt;
  | PipelineExtensionHookResult&lt;TArtifact&gt;
| void&gt;;
```

A pipeline extension hook function.

## Type Parameters

### TContext

`TContext`

### TOptions

`TOptions`

### TArtifact

`TArtifact`

## Parameters

### options

[`PipelineExtensionHookOptions`](../interfaces/PipelineExtensionHookOptions.md)&lt;`TContext`, `TOptions`, `TArtifact`&gt;

## Returns

[`MaybePromise`](MaybePromise.md)&lt;
  \| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)&lt;`TArtifact`&gt;
  \| `void`&gt;
