[**@wpkernel/wp-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ResourceStorageRegistration

# Interface: ResourceStorageRegistration&lt;TStorageKind&gt;

## Type Parameters

### TStorageKind

`TStorageKind` *extends* `string` = `string`

## Properties

### kind

```ts
readonly kind: TStorageKind;
```

***

### label

```ts
readonly label: string;
```

***

### register()

```ts
readonly register: (registry) =&gt; void;
```

#### Parameters

##### registry

[`ResourceAccessorRegistry`](ResourceAccessorRegistry.md)

#### Returns

`void`
