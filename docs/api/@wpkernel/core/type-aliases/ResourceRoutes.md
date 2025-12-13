[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceRoutes

# Type Alias: ResourceRoutes

```ts
type ResourceRoutes = object;
```

Standard CRUD routes for a resource

All routes are optional. At minimum, define the operations your resource supports.

## Example

```ts
{
  list: { path: '/my-plugin/v1/things', method: 'GET' },
  get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
  create: { path: '/my-plugin/v1/things', method: 'POST' },
  update: { path: '/my-plugin/v1/things/:id', method: 'PUT' },
  remove: { path: '/my-plugin/v1/things/:id', method: 'DELETE' }
}
```

## Properties

### create?

```ts
optional create: ResourceRoute;
```

Create a new resource

***

### get?

```ts
optional get: ResourceRoute;
```

Fetch a single resource by identifier

***

### list?

```ts
optional list: ResourceRoute;
```

Fetch a list/collection of resources

***

### remove?

```ts
optional remove: ResourceRoute;
```

Delete a resource

***

### update?

```ts
optional update: ResourceRoute;
```

Update an existing resource
