[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook<TContext, TOptions, TArtifact>

```ts
type PipelineExtensionHook<TContext, TOptions, TArtifact> = (
	options
) => MaybePromise<PipelineExtensionHookResult<TArtifact> | void>;
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

[`PipelineExtensionHookOptions`](../interfaces/PipelineExtensionHookOptions.md)<`TContext`, `TOptions`, `TArtifact`>

## Returns

[`MaybePromise`](MaybePromise.md)<
\| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)<`TArtifact`>
\| `void`>
