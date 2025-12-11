[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / sanitizeNamespace

# Function: sanitizeNamespace()

```ts
function sanitizeNamespace(namespace): string | null;
```

Sanitize namespace string

Converts to lowercase, kebab-case, removes invalid characters,
and checks against reserved words.

## Parameters

### namespace

`string`

Raw namespace string

## Returns

`string` \| `null`

Sanitized namespace or null if invalid
