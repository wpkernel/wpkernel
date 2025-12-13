[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceRequestEvent

# Type Alias: ResourceRequestEvent

```ts
type ResourceRequestEvent = object;
```

Event payload for wpk.resource.request

## Properties

### method

```ts
method: HttpMethod;
```

HTTP method

***

### path

```ts
path: string;
```

Request path

***

### requestId

```ts
requestId: string;
```

Request ID for correlation

***

### timestamp

```ts
timestamp: number;
```

Timestamp when request started

***

### query?

```ts
optional query: Record&lt;string, unknown&gt;;
```

Query parameters (if any)
