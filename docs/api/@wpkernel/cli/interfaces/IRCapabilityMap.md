[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / IRCapabilityMap

# Interface: IRCapabilityMap

Represents an Intermediate Representation (IR) for a capability map.

## Properties

### definitions

```ts
definitions: IRCapabilityDefinition[];
```

An array of capability definitions.

***

### fallback

```ts
fallback: object;
```

Fallback capability definition.

#### appliesTo

```ts
appliesTo: IRCapabilityScope;
```

#### capability

```ts
capability: string;
```

***

### missing

```ts
missing: string[];
```

An array of missing capabilities.

***

### unused

```ts
unused: string[];
```

An array of unused capabilities.

***

### warnings

```ts
warnings: IRWarning[];
```

An array of warnings related to the capability map.

***

### sourcePath?

```ts
optional sourcePath: string;
```

Optional: The source path of the capability map definition.
