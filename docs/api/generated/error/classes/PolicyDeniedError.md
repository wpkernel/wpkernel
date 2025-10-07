[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / PolicyDeniedError

# Class: PolicyDeniedError

Error thrown when a policy assertion fails

## Example

```typescript
throw new PolicyDeniedError({
	namespace: 'my-plugin',
	policyKey: 'posts.edit',
	params: { postId: 123 },
	message: 'You do not have permission to edit this post',
});
```

## Extends

- [`KernelError`](KernelError.md)

## Constructors

### Constructor

```ts
new PolicyDeniedError(options): PolicyDeniedError;
```

Create a new PolicyDeniedError

#### Parameters

##### options

Policy denied error options

###### namespace

`string`

Plugin namespace

###### policyKey

`string`

Policy key that was denied

###### params?

`unknown`

Parameters passed to policy check

###### message?

`string`

Optional custom error message

###### data?

[`ErrorData`](../type-aliases/ErrorData.md)

Additional error data

###### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

Additional error context

#### Returns

`PolicyDeniedError`

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

### messageKey

```ts
readonly messageKey: string;
```

I18n message key for user-facing error messages
Format: `policy.denied.{namespace}.{policyKey}`

---

### policyKey

```ts
readonly policyKey: string;
```

Policy key that was denied

---

### namespace

```ts
readonly namespace: string;
```

Plugin namespace

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
