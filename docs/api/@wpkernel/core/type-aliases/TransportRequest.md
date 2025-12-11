[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / TransportRequest

# Type Alias: TransportRequest

```ts
type TransportRequest = object;
```

Request options for transport.fetch()

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

REST API path (e.g., '/my-plugin/v1/things' or '/my-plugin/v1/things/123')

***

### data?

```ts
optional data: unknown;
```

Request body (for POST/PUT/PATCH)

***

### fields?

```ts
optional fields: string[];
```

Fields to request (_fields query parameter)
If provided, will be added as ?_fields=field1,field2

***

### meta?

```ts
optional meta: TransportMeta;
```

Metadata used for reporter instrumentation.

***

### query?

```ts
optional query: Record&lt;string, unknown&gt;;
```

Query parameters (automatically appended to path)

***

### requestId?

```ts
optional requestId: string;
```

Custom request ID for correlation (generated if not provided)
