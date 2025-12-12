[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ResourceAccessors

# Interface: ResourceAccessors<TStorageKind>

## Type Parameters

### TStorageKind

`TStorageKind` _extends_ `string` = `string`

## Properties

### storages

```ts
readonly storages: readonly ResourceStorageAccessors<TStorageKind>[];
```

---

### storagesByKind

```ts
readonly storagesByKind: ReadonlyMap<TStorageKind, ResourceStorageAccessors<TStorageKind>>;
```
