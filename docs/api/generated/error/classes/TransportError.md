[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / TransportError

# Class: TransportError

Error thrown when a network/HTTP request fails

## Example

```typescript
throw new TransportError({
	status: 404,
	path: '/my-plugin/v1/things/123',
	method: 'GET',
	message: 'Resource not found',
});
```

## Extends

- [`KernelError`](KernelError.md)

## Constructors

### Constructor

```ts
new TransportError(options): TransportError;
```

Create a new TransportError

#### Parameters

##### options

Transport error options

###### status

`number`

###### path

`string`

###### method

`string`

###### message?

`string`

###### data?

[`ErrorData`](../type-aliases/ErrorData.md)

###### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

#### Returns

`TransportError`

#### Overrides

[`KernelError`](KernelError.md).[`constructor`](KernelError.md#constructor)

## Properties

### code

```ts
readonly code: ErrorCode;
```

Error code - identifies the type of error

#### Inherited from

[`KernelError`](KernelError.md).[`code`](KernelError.md#code)

---

### data?

```ts
readonly optional data: ErrorData;
```

Additional data about the error

#### Inherited from

[`KernelError`](KernelError.md).[`data`](KernelError.md#data)

---

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

#### Inherited from

[`KernelError`](KernelError.md).[`context`](KernelError.md#context)

---

### status

```ts
readonly status: number;
```

HTTP status code

---

### path

```ts
readonly path: string;
```

Request path

---

### method

```ts
readonly method: string;
```

HTTP method

## Methods

### toJSON()

```ts
toJSON(): SerializedError;
```

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

#### Inherited from

[`KernelError`](KernelError.md).[`toJSON`](KernelError.md#tojson)

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

[`KernelError`](KernelError.md)

New KernelError instance

#### Inherited from

[`KernelError`](KernelError.md).[`fromJSON`](KernelError.md#fromjson)

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

#### Inherited from

[`KernelError`](KernelError.md).[`isKernelError`](KernelError.md#iskernelerror)

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

[`KernelError`](KernelError.md)

New KernelError wrapping the original

#### Inherited from

[`KernelError`](KernelError.md).[`wrap`](KernelError.md#wrap)

---

### isTimeout()

```ts
isTimeout(): boolean;
```

Check if error is a network timeout

#### Returns

`boolean`

True if this is a timeout error

---

### isRetryable()

```ts
isRetryable(): boolean;
```

Check if error is retryable

#### Returns

`boolean`

True if request should be retried

---

### isClientError()

```ts
isClientError(): boolean;
```

Check if error is a client error (4xx)

#### Returns

`boolean`

True if this is a client error

---

### isServerError()

```ts
isServerError(): boolean;
```

Check if error is a server error (5xx)

#### Returns

`boolean`

True if this is a server error
