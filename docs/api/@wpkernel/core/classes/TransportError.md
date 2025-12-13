[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / TransportError

# Class: TransportError

Error thrown when a network/HTTP request fails

## Example

```typescript
throw new TransportError({
  status: 404,
  path: '/my-plugin/v1/things/123',
  method: 'GET',
  message: 'Resource not found'
});
```

## Extends

- [`WPKernelError`](WPKernelError.md)

## Constructors

### Constructor

```ts
new TransportError(options): TransportError;
```

Create a new TransportError

#### Parameters

##### options

Transport error options

###### method

`string`

###### path

`string`

###### status

`number`

###### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

###### data?

[`ErrorData`](../type-aliases/ErrorData.md)

###### message?

`string`

#### Returns

`TransportError`

#### Overrides

[`WPKernelError`](WPKernelError.md).[`constructor`](WPKernelError.md#constructor)

## Properties

### code

```ts
readonly code: ErrorCode;
```

Error code - identifies the type of error

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`code`](WPKernelError.md#code)

***

### method

```ts
readonly method: string;
```

HTTP method

***

### path

```ts
readonly path: string;
```

Request path

***

### status

```ts
readonly status: number;
```

HTTP status code

***

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`context`](WPKernelError.md#context)

***

### data?

```ts
readonly optional data: ErrorData;
```

Additional data about the error

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`data`](WPKernelError.md#data)

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

[`WPKernelError`](WPKernelError.md)

New WPKernelError instance

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`fromJSON`](WPKernelError.md#fromjson)

***

### isClientError()

```ts
isClientError(): boolean;
```

Check if error is a client error (4xx)

#### Returns

`boolean`

True if this is a client error

***

### isRetryable()

```ts
isRetryable(): boolean;
```

Check if error is retryable

#### Returns

`boolean`

True if request should be retried

***

### isServerError()

```ts
isServerError(): boolean;
```

Check if error is a server error (5xx)

#### Returns

`boolean`

True if this is a server error

***

### isTimeout()

```ts
isTimeout(): boolean;
```

Check if error is a network timeout

#### Returns

`boolean`

True if this is a timeout error

***

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

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`isWPKernelError`](WPKernelError.md#iswpkernelerror)

***

### toJSON()

```ts
toJSON(): SerializedError;
```

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`toJSON`](WPKernelError.md#tojson)

***

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

[`WPKernelError`](WPKernelError.md)

New WPKernelError wrapping the original

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`wrap`](WPKernelError.md#wrap)
