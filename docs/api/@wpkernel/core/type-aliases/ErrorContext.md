[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / ErrorContext

# Type Alias: ErrorContext

```ts
type ErrorContext = object;
```

Context data that can be attached to any error

## Indexable

```ts
[key: string]: unknown
```

Additional arbitrary data

## Properties

### actionName?

```ts
optional actionName: string;
```

***

### capabilityKey?

```ts
optional capabilityKey: string;
```

***

### method?

```ts
optional method: string;
```

***

### path?

```ts
optional path: string;
```

Request details

***

### requestId?

```ts
optional requestId: string;
```

Correlation ID for tracing

***

### resourceName?

```ts
optional resourceName: string;
```

Resource or action name

***

### siteId?

```ts
optional siteId: number;
```

***

### status?

```ts
optional status: number;
```

***

### userId?

```ts
optional userId: number;
```

User/environment context
