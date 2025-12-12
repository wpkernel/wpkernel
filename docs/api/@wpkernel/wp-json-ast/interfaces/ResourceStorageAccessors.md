[**@wpkernel/wp-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ResourceStorageAccessors

# Interface: ResourceStorageAccessors&lt;TStorageKind&gt;

## Extends

- `ResourceAccessorBuckets`

## Type Parameters

### TStorageKind

`TStorageKind` *extends* `string` = `string`

## Properties

### caches

```ts
readonly caches: readonly ResourceAccessorDescriptor&lt;unknown&gt;[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.caches
```

***

### helpers

```ts
readonly helpers: readonly ResourceAccessorDescriptor&lt;unknown&gt;[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.helpers
```

***

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

### mutations

```ts
readonly mutations: readonly ResourceAccessorDescriptor&lt;unknown&gt;[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.mutations
```

***

### queries

```ts
readonly queries: readonly ResourceAccessorDescriptor&lt;unknown&gt;[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.queries
```

***

### requests

```ts
readonly requests: readonly ResourceAccessorDescriptor&lt;unknown&gt;[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.requests
```
