[**@wpkernel/pipeline v0.12.3-beta.2**](../README.md)

---

[@wpkernel/pipeline](../README.md) / ErrorFactory

# Type Alias: ErrorFactory

```ts
type ErrorFactory = (code, message) => Error;
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
const createError = (code: string, message: string) =>
	new MyCustomError(code, { message });
```
