[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / ResourceResponseEvent

# Type Alias: ResourceResponseEvent\<T\>

```ts
type ResourceResponseEvent<T> = object;
```

Event payload for wpk.resource.response

## Type Parameters

### T

`T` = `unknown`

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

### status

```ts
status: number;
```

Response status code

---

### data

```ts
data: T;
```

Response data

---

### duration

```ts
duration: number;
```

Duration in milliseconds

---

### timestamp

```ts
timestamp: number;
```

Timestamp when response received
