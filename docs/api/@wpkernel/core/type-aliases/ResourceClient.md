[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceClient

# Type Alias: ResourceClient&lt;T, TQuery&gt;

```ts
type ResourceClient&lt;T, TQuery&gt; = object;
```

Client methods for REST operations

Generated automatically by defineResource based on configured routes.
All methods return Promises with typed responses.

## Type Parameters

### T

`T` = `unknown`

The resource entity type

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations

## Properties

### create()?

```ts
optional create: (data) =&gt; Promise&lt;T&gt;;
```

Create a new resource

#### Parameters

##### data

`Partial`&lt;`T`&gt;

Resource data to create

#### Returns

`Promise`&lt;`T`&gt;

Promise resolving to created resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including validation errors)

***

### fetch()?

```ts
optional fetch: (id) =&gt; Promise&lt;T&gt;;
```

Fetch a single resource by ID

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`&lt;`T`&gt;

Promise resolving to resource entity

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404)

***

### fetchList()?

```ts
optional fetchList: (query?) =&gt; Promise&lt;ListResponse&lt;T&gt;&gt;;
```

Fetch a list of resources

#### Parameters

##### query?

`TQuery`

Query parameters (filters, pagination, etc.)

#### Returns

`Promise`&lt;[`ListResponse`](ListResponse.md)&lt;`T`&gt;&gt;

Promise resolving to list response

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error

***

### remove()?

```ts
optional remove: (id) =&gt; Promise&lt;void | T&gt;;
```

Delete a resource

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`&lt;`void` \| `T`&gt;

Promise resolving to void or deleted resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404)

***

### ui?

```ts
optional ui: ResourceUIConfig;
```

Optional UI metadata carried over from ResourceConfig.ui.

***

### update()?

```ts
optional update: (id, data) =&gt; Promise&lt;T&gt;;
```

Update an existing resource

#### Parameters

##### id

Resource identifier

`string` | `number`

##### data

`Partial`&lt;`T`&gt;

Partial resource data to update

#### Returns

`Promise`&lt;`T`&gt;

Promise resolving to updated resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404, validation errors)
