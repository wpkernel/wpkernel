[**@wpkernel/e2e-utils v0.12.6-beta.2**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / ResourceUtils

# Type Alias: ResourceUtils&lt;T&gt;

```ts
type ResourceUtils&lt;T&gt; = object;
```

Resource utilities for seeding and cleanup

## Type Parameters

### T

`T` = `unknown`

## Properties

### deleteAll()

```ts
deleteAll: () =&gt; Promise&lt;void&gt;;
```

Delete all resources (cleanup utility)
WARNING: This will delete all resources of this type

#### Returns

`Promise`&lt;`void`&gt;

***

### remove()

```ts
remove: (id) =&gt; Promise&lt;void&gt;;
```

Remove a single resource by ID

#### Parameters

##### id

Resource ID to delete

`string` | `number`

#### Returns

`Promise`&lt;`void`&gt;

***

### seed()

```ts
seed: (data) =&gt; Promise&lt;T & object&gt;;
```

Seed a single resource via REST API

#### Parameters

##### data

`Partial`&lt;`T`&gt;

Resource data to create

#### Returns

`Promise`&lt;`T` & `object`&gt;

Created resource with ID

***

### seedMany()

```ts
seedMany: (items) =&gt; Promise&lt;T & object[]&gt;;
```

Seed multiple resources in bulk

#### Parameters

##### items

`Partial`&lt;`T`&gt;[]

Array of resource data to create

#### Returns

`Promise`&lt;`T` & `object`[]&gt;

Array of created resources with IDs
