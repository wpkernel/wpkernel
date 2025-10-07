[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / extractPathParams

# Function: extractPathParams()

```ts
function extractPathParams(path): string[];
```

Extract parameter names from a path

## Parameters

### path

`string`

REST path with :param placeholders

## Returns

`string`[]

Array of parameter names

## Example

```ts
extractPathParams('/my-plugin/v1/things/:id');
// => ['id']

extractPathParams('/my-plugin/v1/things/:id/comments/:commentId');
// => ['id', 'commentId']
```
