[**@wpkernel/pipeline v0.12.6-beta.2**](../README.md)

***

[@wpkernel/pipeline](../README.md) / RunRollbackStackOptions

# Interface: RunRollbackStackOptions

Options for executing a rollback stack.

## Properties

### source

```ts
readonly source: "extension" | "helper";
```

***

### onError()?

```ts
readonly optional onError: (args) =&gt; void;
```

#### Parameters

##### args

###### entry

[`PipelineRollback`](PipelineRollback.md)

###### error

`unknown`

###### metadata

[`PipelineRollbackErrorMetadata`](PipelineRollbackErrorMetadata.md)

#### Returns

`void`
