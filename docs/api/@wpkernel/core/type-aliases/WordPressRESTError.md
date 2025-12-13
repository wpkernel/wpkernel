[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / WordPressRESTError

# Type Alias: WordPressRESTError

```ts
type WordPressRESTError = object;
```

WordPress REST API error response shape

This interface represents the standard error format returned by WordPress REST API.

## Properties

### code

```ts
code: string;
```

Error code from WordPress (e.g., 'rest_forbidden', 'invalid_param')

---

### message

```ts
message: string;
```

Human-readable error message

---

### data?

```ts
optional data: object;
```

Additional error data

#### Index Signature

```ts
[key: string]: unknown
```

#### details?

```ts
optional details: Record<string, unknown>;
```

Detailed validation or error information

#### params?

```ts
optional params: Record<string, string>;
```

Invalid parameters that caused the error

#### status?

```ts
optional status: number;
```

HTTP status code
