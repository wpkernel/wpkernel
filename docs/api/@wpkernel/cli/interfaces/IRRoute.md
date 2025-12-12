[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / IRRoute

# Interface: IRRoute

Represents an Intermediate Representation (IR) for a resource route.

## Properties

### hash

```ts
hash: IRHashProvenance;
```

A hash of the route definition for change detection.

***

### method

```ts
method: string;
```

The HTTP method of the route (e.g., 'GET', 'POST').

***

### path

```ts
path: string;
```

The URL path of the route.

***

### transport

```ts
transport: IRRouteTransport;
```

The transport mechanism for the route (local or remote).

***

### capability?

```ts
optional capability: string;
```

Optional: The capability required to access this route.
