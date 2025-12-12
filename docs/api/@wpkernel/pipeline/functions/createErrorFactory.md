[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

***

[@wpkernel/pipeline](../README.md) / createErrorFactory

# Function: createErrorFactory()

```ts
function createErrorFactory(create): ErrorFactory;
```

Creates an error factory that wraps a custom error class.

## Parameters

### create

(`code`, `message`) =&gt; `Error`

A function that creates an Error instance based on a code and message.

## Returns

[`ErrorFactory`](../type-aliases/ErrorFactory.md)

An error factory function

## Example

```typescript
class WPKernelError extends Error {
  constructor(code: string, options: { message: string }) {
    super(options.message);
    this.name = code;
  }
}

const createError = createErrorFactory(
  (code, message) =&gt; new WPKernelError(code, { message })
);
```
