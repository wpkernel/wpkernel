[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / IRSchema

# Interface: IRSchema

Represents an Intermediate Representation (IR) for a schema.

## Properties

### hash

```ts
hash: IRHashProvenance;
```

A hash of the schema content for change detection.

---

### id

```ts
id: string;
```

Stable identifier for the schema entry.

---

### key

```ts
key: string;
```

A unique key for the schema.

---

### provenance

```ts
provenance: SchemaProvenance;
```

The provenance of the schema (manual or auto-generated).

---

### schema

```ts
schema: unknown;
```

The actual schema definition.

---

### sourcePath

```ts
sourcePath: string;
```

The source path of the schema definition.

---

### generatedFrom?

```ts
optional generatedFrom: object;
```

Optional: Information about what the schema was generated from.

#### resource

```ts
resource: string;
```

#### type

```ts
type: 'storage';
```
