[**@wpkernel/wp-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / CapabilityHelperDefinitionMetadata

# Interface: CapabilityHelperDefinitionMetadata

Metadata for a capability helper definition.

## See

CapabilityHelperMetadata

## Properties

### appliesTo

```ts
readonly appliesTo: "object" | "resource";
```

The scope to which the capability applies.

***

### capability

```ts
readonly capability: string;
```

The name of the capability.

***

### key

```ts
readonly key: string;
```

The key of the capability.

***

### source

```ts
readonly source: "map" | "fallback";
```

The source of the capability definition.

***

### binding?

```ts
readonly optional binding: string;
```

The binding for the capability.
