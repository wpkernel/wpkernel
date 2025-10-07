[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / TransportResponse

# Type Alias: TransportResponse\<T\>

```ts
type TransportResponse<T> = object;
```

Response from transport.fetch()

## Type Parameters

### T

`T` = `unknown`

## Properties

### data

```ts
data: T;
```

Response data

---

### status

```ts
status: number;
```

HTTP status code

---

### headers

```ts
headers: Record<string, string>;
```

Response headers

---

### requestId

```ts
requestId: string;
```

Request ID used for this request (for correlation)
