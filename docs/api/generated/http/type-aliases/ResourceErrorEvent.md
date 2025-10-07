[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / ResourceErrorEvent

# Type Alias: ResourceErrorEvent

```ts
type ResourceErrorEvent = object;
```

Event payload for wpk.resource.error

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

### code

```ts
code: string;
```

Error code

---

### message

```ts
message: string;
```

Error message

---

### status?

```ts
optional status: number;
```

HTTP status code (if available)

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

Timestamp when error occurred
