[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / ErrorContext

# Type Alias: ErrorContext

```ts
type ErrorContext = object;
```

Context data that can be attached to any error

## Indexable

```ts
[key: string]: unknown
```

Additional arbitrary data

## Properties

### resourceName?

```ts
optional resourceName: string;
```

Resource or action name

---

### actionName?

```ts
optional actionName: string;
```

---

### policyKey?

```ts
optional policyKey: string;
```

---

### path?

```ts
optional path: string;
```

Request details

---

### method?

```ts
optional method: string;
```

---

### status?

```ts
optional status: number;
```

---

### userId?

```ts
optional userId: number;
```

User/environment context

---

### siteId?

```ts
optional siteId: number;
```

---

### requestId?

```ts
optional requestId: string;
```

Correlation ID for tracing
