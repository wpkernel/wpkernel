[**@wpkernel/wp-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ResourceStorageRegistration

# Interface: ResourceStorageRegistration<TStorageKind>

## Type Parameters

### TStorageKind

`TStorageKind` _extends_ `string` = `string`

## Properties

### kind

```ts
readonly kind: TStorageKind;
```

---

### label

```ts
readonly label: string;
```

---

### register()

```ts
readonly register: (registry) => void;
```

#### Parameters

##### registry

[`ResourceAccessorRegistry`](ResourceAccessorRegistry.md)

#### Returns

`void`
