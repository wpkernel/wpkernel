[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / interpolatePath

# Function: interpolatePath()

```ts
function interpolatePath(path, params): string;
```

Interpolate dynamic segments in a REST path

Replaces `:paramName` patterns with values from the params object.
Throws DeveloperError if required params are missing.

## Parameters

### path

`string`

REST path with :param placeholders

### params

[`PathParams`](../type-aliases/PathParams.md) = `{}`

Parameter values to interpolate

## Returns

`string`

Interpolated path

## Throws

DeveloperError if required params are missing

## Example

```ts
interpolatePath('/my-plugin/v1/things/:id', { id: 123 });
// => '/my-plugin/v1/things/123'

interpolatePath('/my-plugin/v1/things/:id', {}); // throws DeveloperError
```
