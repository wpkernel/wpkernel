[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / interpolatePath

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
interpolatePath('/my-plugin/v1/things/:id', { id: 123 })
// =&gt; '/my-plugin/v1/things/123'

interpolatePath('/my-plugin/v1/things/:id', {}) // throws DeveloperError
```
