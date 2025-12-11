[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / IRCapabilityHint

# Interface: IRCapabilityHint

Represents an Intermediate Representation (IR) for a capability hint.

## Properties

### key

```ts
key: string;
```

The key of the capability.

***

### references

```ts
references: object[];
```

References to where this capability is used.

#### resource

```ts
resource: string;
```

#### route

```ts
route: string;
```

#### transport

```ts
transport: IRRouteTransport;
```

***

### source

```ts
source: "resource" | "config";
```

The source of the capability hint (resource or config).
