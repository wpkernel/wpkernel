[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / IRCapabilityDefinition

# Interface: IRCapabilityDefinition

Represents an Intermediate Representation (IR) for a capability definition.

## Properties

### appliesTo

```ts
appliesTo: IRCapabilityScope;
```

The scope to which the capability applies.

***

### capability

```ts
capability: string;
```

The underlying capability string.

***

### id

```ts
id: string;
```

Stable identifier for the capability definition.

***

### key

```ts
key: string;
```

The key of the capability.

***

### source

```ts
source: "map" | "fallback";
```

The source of the capability definition (map or fallback).

***

### binding?

```ts
optional binding: string;
```

Optional: The binding parameter for object-level capabilities.
