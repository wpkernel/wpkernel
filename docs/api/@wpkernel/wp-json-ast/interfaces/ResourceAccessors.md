[**@wpkernel/wp-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ResourceAccessors

# Interface: ResourceAccessors&lt;TStorageKind&gt;

## Type Parameters

### TStorageKind

`TStorageKind` *extends* `string` = `string`

## Properties

### storages

```ts
readonly storages: readonly ResourceStorageAccessors&lt;TStorageKind&gt;[];
```

***

### storagesByKind

```ts
readonly storagesByKind: ReadonlyMap&lt;TStorageKind, ResourceStorageAccessors&lt;TStorageKind&gt;&gt;;
```
