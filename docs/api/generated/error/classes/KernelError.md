[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / KernelError

# Class: KernelError

Base error class for WP Kernel

## Example

```typescript
throw new KernelError('PolicyDenied', {
	message: 'User lacks required capability',
	context: { policyKey: 'things.manage', userId: 123 },
});
```

## Extends

- `Error`

## Extended by

- [`TransportError`](TransportError.md)
- [`ServerError`](ServerError.md)
- [`PolicyDeniedError`](PolicyDeniedError.md)

## Constructors

### Constructor

```ts
new KernelError(code, options): KernelError;
```

Create a new KernelError

#### Parameters

##### code

[`ErrorCode`](../type-aliases/ErrorCode.md)

Error code identifying the error type

##### options

Error options

###### message?

`string`

###### data?

[`ErrorData`](../type-aliases/ErrorData.md)

###### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

#### Returns

`KernelError`

#### Overrides

```ts
Error.constructor;
```

## Properties

### code

```ts
readonly code: ErrorCode;
```

Error code - identifies the type of error

---

### data?

```ts
readonly optional data: ErrorData;
```

Additional data about the error

---

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

## Methods

### toJSON()

```ts
toJSON(): SerializedError;
```

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

---

### fromJSON()

```ts
static fromJSON(serialized): KernelError;
```

Create KernelError from serialized format

#### Parameters

##### serialized

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

#### Returns

`KernelError`

New KernelError instance

---

### isKernelError()

```ts
static isKernelError(error): error is KernelError;
```

Check if an error is a KernelError

#### Parameters

##### error

`unknown`

Error to check

#### Returns

`error is KernelError`

True if error is a KernelError

---

### wrap()

```ts
static wrap(
   error,
   code,
   context?): KernelError;
```

Wrap a native Error into a KernelError

#### Parameters

##### error

`Error`

Native error to wrap

##### code

[`ErrorCode`](../type-aliases/ErrorCode.md) = `'UnknownError'`

Error code to assign

##### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

Additional context

#### Returns

`KernelError`

New KernelError wrapping the original
