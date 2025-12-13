[**@wpkernel/pipeline v0.12.6-beta.0**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineRollback

# Interface: PipelineRollback

A rollback operation that can be executed to undo changes.

Rollbacks are collected during helper/extension execution and invoked in reverse order
if the pipeline encounters a failure, enabling cleanup and state restoration.

## Properties

### run()

```ts
readonly run: () =&gt; unknown;
```

#### Returns

`unknown`

***

### key?

```ts
readonly optional key: string;
```

***

### label?

```ts
readonly optional label: string;
```
