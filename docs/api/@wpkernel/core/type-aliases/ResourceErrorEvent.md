[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceErrorEvent

# Type Alias: ResourceErrorEvent

```ts
type ResourceErrorEvent = object;
```

Event payload for wpk.resource.error

## Properties

### code

```ts
code: string;
```

Error code

---

### duration

```ts
duration: number;
```

Duration in milliseconds

---

### message

```ts
message: string;
```

Error message

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

### requestId

```ts
requestId: string;
```

Request ID for correlation

---

### timestamp

```ts
timestamp: number;
```

Timestamp when error occurred

---

### status?

```ts
optional status: number;
```

HTTP status code (if available)
