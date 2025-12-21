[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

***

[@wpkernel/pipeline](../README.md) / ErrorFactory

# Type Alias: ErrorFactory

```ts
type ErrorFactory = (code, message) =&gt; Error;
```

Factory function for creating errors.
Allows the pipeline to be framework-agnostic.

## Parameters

### code

`string`

Error code (e.g., 'ValidationError', 'RuntimeError')

### message

`string`

Error message

## Returns

`Error`

An Error instance

## Example

```typescript
const createError = (code: string, message: string) =&gt;
  new MyCustomError(code, { message });
```
