[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / ErrorData

# Type Alias: ErrorData

```ts
type ErrorData = object;
```

Data payload that can be attached to errors

## Indexable

```ts
[key: string]: unknown
```

Additional arbitrary data

## Properties

### originalError?

```ts
optional originalError: Error;
```

Original error if wrapping

---

### validationErrors?

```ts
optional validationErrors: object[];
```

Validation errors

#### field

```ts
field: string;
```

#### message

```ts
message: string;
```

#### code?

```ts
optional code: string;
```

---

### serverCode?

```ts
optional serverCode: string;
```

Server error details

---

### serverMessage?

```ts
optional serverMessage: string;
```

---

### serverData?

```ts
optional serverData: unknown;
```
