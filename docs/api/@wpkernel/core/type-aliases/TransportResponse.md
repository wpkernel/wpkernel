[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / TransportResponse

# Type Alias: TransportResponse<T>

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

### headers

```ts
headers: Record & lt;
(string, string & gt);
```

Response headers

---

### requestId

```ts
requestId: string;
```

Request ID used for this request (for correlation)

---

### status

```ts
status: number;
```

HTTP status code
