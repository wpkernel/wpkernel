[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / HelperApplyResult

# Interface: HelperApplyResult&lt;TOutput&gt;

Result returned from a helper's apply function.

Helpers can declare rollback operations to be executed if the pipeline
encounters a failure after the helper completes.

## Type Parameters

### TOutput

`TOutput`

## Properties

### output?

```ts
readonly optional output: TOutput;
```

***

### rollback?

```ts
readonly optional rollback: PipelineRollback;
```
