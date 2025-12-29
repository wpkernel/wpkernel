[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceQueryParamDescriptor

# Type Alias: ResourceQueryParamDescriptor

```ts
type ResourceQueryParamDescriptor = object;
```

Descriptor for query parameters exposed by a resource.

Used by tooling to generate REST argument metadata.

## Properties

### type

```ts
type: 'string' | 'enum';
```

---

### description?

```ts
optional description: string;
```

---

### enum?

```ts
optional enum: readonly string[];
```

---

### optional?

```ts
optional optional: boolean;
```
