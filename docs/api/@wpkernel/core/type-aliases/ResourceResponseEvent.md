[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceResponseEvent

# Type Alias: ResourceResponseEvent<T>

```ts
type ResourceResponseEvent<T> = object;
```

Event payload for wpk.resource.response

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

### duration

```ts
duration: number;
```

Duration in milliseconds

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

### status

```ts
status: number;
```

Response status code

---

### timestamp

```ts
timestamp: number;
```

Timestamp when response received
