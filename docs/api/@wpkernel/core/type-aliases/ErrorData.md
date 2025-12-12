[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ErrorData

# Type Alias: ErrorData

```ts
type ErrorData = object;
```

Data payload that can be attached to errors

## Indexable

```ts
[key: string]: unknown
```

Additional arbitrary data

## Properties

### originalError?

```ts
optional originalError: Error;
```

Original error if wrapping

***

### serverCode?

```ts
optional serverCode: string;
```

Server error details

***

### serverData?

```ts
optional serverData: unknown;
```

***

### serverMessage?

```ts
optional serverMessage: string;
```

***

### validationErrors?

```ts
optional validationErrors: object[];
```

Validation errors

#### field

```ts
field: string;
```

#### message

```ts
message: string;
```

#### code?

```ts
optional code: string;
```
