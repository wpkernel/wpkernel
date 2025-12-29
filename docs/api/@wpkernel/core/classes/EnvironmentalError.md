[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / EnvironmentalError

# Class: EnvironmentalError

Error thrown when environment or readiness preconditions fail.

## Extends

- [`WPKernelError`](WPKernelError.md)

## Constructors

### Constructor

```ts
new EnvironmentalError(reason, options): EnvironmentalError;
```

#### Parameters

##### reason

`string`

##### options

`EnvironmentalErrorOptions` = `{}`

#### Returns

`EnvironmentalError`

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

---

### reason

```ts
readonly reason: string;
```

---

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`context`](WPKernelError.md#context)

---

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

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`isWPKernelError`](WPKernelError.md#iswpkernelerror)

---

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

[`WPKernelError`](WPKernelError.md)

New WPKernelError wrapping the original

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`wrap`](WPKernelError.md#wrap)
