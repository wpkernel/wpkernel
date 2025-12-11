[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / SchemaConfig

# Interface: SchemaConfig

Configuration for a registered schema file.

Describes a shared schema source and where generated TypeScript types should
be written. Mirrors the JSON Schema `schemaConfig` definition.

## Properties

### path

```ts
path: string;
```

Relative path (from plugin root) to the source schema file
(for example, a JSON Schema or Zod schema).

***

### description?

```ts
optional description: string;
```

Human-readable description of what this schema models
(for example, "Public job listing API payload").
