[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

***

[@wpkernel/pipeline](../README.md) / createPipelineRollback

# Function: createPipelineRollback()

```ts
function createPipelineRollback(run, options): PipelineRollback;
```

Creates a pipeline rollback object with metadata.

This is a lightweight wrapper that helps distinguish rollback operations in diagnostics
and error handling. It's used by both helpers and extensions to declare cleanup functions.

## Parameters

### run

() =&gt; `unknown`

The rollback function to execute

### options

Optional metadata (key, label) for diagnostics

#### key?

`string`

#### label?

`string`

## Returns

[`PipelineRollback`](../interfaces/PipelineRollback.md)

A rollback descriptor with the run function and metadata

## Example

```typescript
const rollback = createPipelineRollback(
  () =&gt; {
    cleanup();
  },
  {
    key: 'my-helper',
    label: 'Restore previous state',
  }
);
```
