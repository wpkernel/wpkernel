[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / PolicyDeniedError

# Class: PolicyDeniedError

Defined in: [error/PolicyDeniedError.ts:26](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/PolicyDeniedError.ts#L26)

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

Defined in: [error/PolicyDeniedError.ts:54](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/PolicyDeniedError.ts#L54)

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

[`ErrorData`](../interfaces/ErrorData.md)

Additional error data

###### context?

[`ErrorContext`](../interfaces/ErrorContext.md)

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

Defined in: [error/KernelError.ts:32](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L32)

Error code - identifies the type of error

#### Inherited from

[`KernelError`](KernelError.md).[`code`](KernelError.md#code)

---

### data?

```ts
readonly optional data: ErrorData;
```

Defined in: [error/KernelError.ts:37](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L37)

Additional data about the error

#### Inherited from

[`KernelError`](KernelError.md).[`data`](KernelError.md#data)

---

### context?

```ts
readonly optional context: ErrorContext;
```

Defined in: [error/KernelError.ts:42](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L42)

Context in which the error occurred

#### Inherited from

[`KernelError`](KernelError.md).[`context`](KernelError.md#context)

---

### messageKey

```ts
readonly messageKey: string;
```

Defined in: [error/PolicyDeniedError.ts:31](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/PolicyDeniedError.ts#L31)

I18n message key for user-facing error messages
Format: `policy.denied.{namespace}.{policyKey}`

---

### policyKey

```ts
readonly policyKey: string;
```

Defined in: [error/PolicyDeniedError.ts:36](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/PolicyDeniedError.ts#L36)

Policy key that was denied

---

### namespace

```ts
readonly namespace: string;
```

Defined in: [error/PolicyDeniedError.ts:41](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/PolicyDeniedError.ts#L41)

Plugin namespace

## Methods

### toJSON()

```ts
toJSON(): SerializedError;
```

Defined in: [error/KernelError.ts:84](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L84)

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../interfaces/SerializedError.md)

Serialized error object

#### Inherited from

[`KernelError`](KernelError.md).[`toJSON`](KernelError.md#tojson)

---

### fromJSON()

```ts
static fromJSON(serialized): KernelError;
```

Defined in: [error/KernelError.ts:101](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L101)

Create KernelError from serialized format

#### Parameters

##### serialized

[`SerializedError`](../interfaces/SerializedError.md)

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

Defined in: [error/KernelError.ts:144](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L144)

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

Defined in: [error/KernelError.ts:156](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L156)

Wrap a native Error into a KernelError

#### Parameters

##### error

`Error`

Native error to wrap

##### code

[`ErrorCode`](../type-aliases/ErrorCode.md) = `'UnknownError'`

Error code to assign

##### context?

[`ErrorContext`](../interfaces/ErrorContext.md)

Additional context

#### Returns

[`KernelError`](KernelError.md)

New KernelError wrapping the original

#### Inherited from

[`KernelError`](KernelError.md).[`wrap`](KernelError.md#wrap)
