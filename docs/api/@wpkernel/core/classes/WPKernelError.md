[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / WPKernelError

# Class: WPKernelError

Base error class for WPKernel

## Example

```typescript
throw new WPKernelError('CapabilityDenied', {
	message: 'User lacks required capability',
	context: { capabilityKey: 'things.manage', userId: 123 },
});
```

## Extends

- `Error`

## Extended by

- [`TransportError`](TransportError.md)
- [`ServerError`](ServerError.md)
- [`EnvironmentalError`](EnvironmentalError.md)

## Constructors

### Constructor

```ts
new WPKernelError(code, options): WPKernelError;
```

Create a new WPKernelError

#### Parameters

##### code

[`ErrorCode`](../type-aliases/ErrorCode.md)

Error code identifying the error type

##### options

Error options

###### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

###### data?

[`ErrorData`](../type-aliases/ErrorData.md)

###### message?

`string`

#### Returns

`WPKernelError`

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

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

---

### data?

```ts
readonly optional data: ErrorData;
```

Additional data about the error

## Methods

### fromJSON()

```ts
static fromJSON(serialized): WPKernelError;
```

Create WPKernelError from serialized format

#### Parameters

##### serialized

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

#### Returns

`WPKernelError`

New WPKernelError instance

---

### isWPKernelError()

```ts
static isWPKernelError(error): error is WPKernelError;
```

Check if an error is a WPKernelError

#### Parameters

##### error

`unknown`

Error to check

#### Returns

`error is WPKernelError`

True if error is a WPKernelError

---

### toJSON()

```ts
toJSON(): SerializedError;
```

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

---

### wrap()

```ts
static wrap(
   error,
   code,
   context?): WPKernelError;
```

Wrap a native Error into a WPKernelError

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

`WPKernelError`

New WPKernelError wrapping the original
