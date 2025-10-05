[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / extractPathParams

# Function: extractPathParams()

```ts
function extractPathParams(path): string[];
```

Defined in: [resource/cache.ts:465](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L465)

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
