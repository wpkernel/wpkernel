[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / TransportRequest

# Type Alias: TransportRequest

```ts
type TransportRequest = object;
```

Request options for transport.fetch()

## Properties

### path

```ts
path: string;
```

REST API path (e.g., '/my-plugin/v1/things' or '/my-plugin/v1/things/123')

---

### method

```ts
method: HttpMethod;
```

HTTP method

---

### data?

```ts
optional data: unknown;
```

Request body (for POST/PUT/PATCH)

---

### query?

```ts
optional query: Record<string, unknown>;
```

Query parameters (automatically appended to path)

---

### fields?

```ts
optional fields: string[];
```

Fields to request (\_fields query parameter)
If provided, will be added as ?\_fields=field1,field2

---

### requestId?

```ts
optional requestId: string;
```

Custom request ID for correlation (generated if not provided)
