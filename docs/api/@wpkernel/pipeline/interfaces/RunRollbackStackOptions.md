[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / RunRollbackStackOptions

# Interface: RunRollbackStackOptions

Options for executing a rollback stack.

## Properties

### source

```ts
readonly source: "extension" | "helper";
```

---

### onError()?

```ts
readonly optional onError: (args) => void;
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
