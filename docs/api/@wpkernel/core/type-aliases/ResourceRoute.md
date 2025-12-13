[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceRoute

# Type Alias: ResourceRoute

```ts
type ResourceRoute = object;
```

Route definition for a single REST operation

## Example

```ts
{ path: '/my-plugin/v1/things/:id', method: 'GET' }
```

## Properties

### method

```ts
method: HttpMethod;
```

HTTP method

---

### path

```ts
path: string;
```

REST API path (may include :id, :slug patterns)

---

### capability?

```ts
optional capability: string;
```

Optional capability identifier used by tooling to map to capability checks
