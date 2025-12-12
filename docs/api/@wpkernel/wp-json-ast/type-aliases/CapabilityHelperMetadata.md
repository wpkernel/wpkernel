[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / CapabilityHelperMetadata

# Type Alias: CapabilityHelperMetadata

```ts
type CapabilityHelperMetadata = BasePhpFileMetadata & object;
```

Metadata for a capability helper.

## Type Declaration

### kind

```ts
readonly kind: "capability-helper";
```

The kind of metadata.

### map

```ts
readonly map: object;
```

The capability map.

#### map.definitions

```ts
readonly definitions: readonly CapabilityHelperDefinitionMetadata[];
```

The capability definitions.

#### map.fallback

```ts
readonly fallback: object;
```

The fallback capability.

#### map.fallback.appliesTo

```ts
readonly appliesTo: "resource" | "object";
```

The scope to which the fallback capability applies.

#### map.fallback.capability

```ts
readonly capability: string;
```

The name of the fallback capability.

#### map.missing

```ts
readonly missing: readonly string[];
```

Missing capabilities.

#### map.unused

```ts
readonly unused: readonly string[];
```

Unused capabilities.

#### map.warnings

```ts
readonly warnings: readonly CapabilityHelperWarningMetadata[];
```

Warnings for the capability map.

#### map.sourcePath?

```ts
readonly optional sourcePath: string;
```

The path to the capability map source.

### name?

```ts
readonly optional name: string;
```

The name of the helper.
