[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / ServerError

# Class: ServerError

Error thrown when WordPress REST API returns an error

## Example

```typescript
throw new ServerError({
	serverCode: 'rest_forbidden',
	serverMessage: 'Sorry, you are not allowed to do that.',
	status: 403,
	path: '/wpk/v1/things',
	method: 'POST',
});
```

## Extends

- [`KernelError`](KernelError.md)

## Constructors

### Constructor

```ts
new ServerError(options): ServerError;
```

Create a new ServerError

#### Parameters

##### options

Server error options

###### serverCode

`string`

###### serverMessage

`string`

###### status

`number`

###### path

`string`

###### method

`string`

###### serverData?

`Record`\<`string`, `unknown`\>

###### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

#### Returns

`ServerError`

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

### serverCode

```ts
readonly serverCode: string;
```

WordPress error code (e.g., 'rest_forbidden', 'rest_invalid_param')

---

### serverMessage

```ts
readonly serverMessage: string;
```

WordPress error message

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

---

### serverData?

```ts
readonly optional serverData: Record<string, unknown>;
```

Additional server data

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

### fromWordPressResponse()

```ts
static fromWordPressResponse(
   response,
   path,
   method,
   context?): ServerError;
```

Parse WordPress REST API error response into ServerError

#### Parameters

##### response

[`WordPressRESTError`](../type-aliases/WordPressRESTError.md)

WordPress REST error response

##### path

`string`

Request path

##### method

`string`

HTTP method

##### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

Additional context

#### Returns

`ServerError`

New ServerError instance

---

### isPermissionError()

```ts
isPermissionError(): boolean;
```

Check if this is a permission/capability error

#### Returns

`boolean`

True if this is a permission error

---

### isValidationError()

```ts
isValidationError(): boolean;
```

Check if this is a validation error

#### Returns

`boolean`

True if this is a validation error

---

### isNotFoundError()

```ts
isNotFoundError(): boolean;
```

Check if this is a "not found" error

#### Returns

`boolean`

True if resource was not found

---

### getValidationErrors()

```ts
getValidationErrors(): object[];
```

Extract validation errors from server response

#### Returns

`object`[]

Array of validation errors if available
