[**@wpkernel/e2e-utils v0.12.6-beta.3**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / ResourceUtils

# Type Alias: ResourceUtils<T>

```ts
type ResourceUtils<T> = object;
```

Resource utilities for seeding and cleanup

## Type Parameters

### T

`T` = `unknown`

## Properties

### deleteAll()

```ts
deleteAll: () => Promise<void>;
```

Delete all resources (cleanup utility)
WARNING: This will delete all resources of this type

#### Returns

`Promise`<`void`>

---

### remove()

```ts
remove: (id) => Promise<void>;
```

Remove a single resource by ID

#### Parameters

##### id

Resource ID to delete

`string` | `number`

#### Returns

`Promise`<`void`>

---

### seed()

```ts
seed: (data) => Promise<T & object>;
```

Seed a single resource via REST API

#### Parameters

##### data

`Partial`<`T`>

Resource data to create

#### Returns

`Promise`<`T` & `object`>

Created resource with ID

---

### seedMany()

```ts
seedMany: (items) => Promise<T & object[]>;
```

Seed multiple resources in bulk

#### Parameters

##### items

`Partial`<`T`>[]

Array of resource data to create

#### Returns

`Promise`<`T` & `object`[]>

Array of created resources with IDs
