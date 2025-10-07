[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / ResourceRequestEvent

# Type Alias: ResourceRequestEvent

```ts
type ResourceRequestEvent = object;
```

Event payload for wpk.resource.request

## Properties

### requestId

```ts
requestId: string;
```

Request ID for correlation

---

### method

```ts
method: HttpMethod;
```

HTTP method

---

### path

```ts
path: string;
```

Request path

---

### query?

```ts
optional query: Record<string, unknown>;
```

Query parameters (if any)

---

### timestamp

```ts
timestamp: number;
```

Timestamp when request started
