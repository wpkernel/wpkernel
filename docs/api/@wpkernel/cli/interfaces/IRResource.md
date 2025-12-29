[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / IRResource

# Interface: IRResource

Represents an Intermediate Representation (IR) for a resource.

## Properties

### cacheKeys

```ts
cacheKeys: object;
```

Cache key definitions for various resource operations.

#### get

```ts
get: IRResourceCacheKey;
```

#### list

```ts
list: IRResourceCacheKey;
```

#### create?

```ts
optional create: IRResourceCacheKey;
```

#### remove?

```ts
optional remove: IRResourceCacheKey;
```

#### update?

```ts
optional update: IRResourceCacheKey;
```

---

### controllerClass

```ts
controllerClass: string;
```

Fully-qualified PHP controller class name for this resource.

---

### hash

```ts
hash: IRHashProvenance;
```

A hash of the resource definition for change detection.

---

### id

```ts
id: string;
```

Stable identifier for the resource entry.

---

### name

```ts
name: string;
```

The name of the resource.

---

### routes

```ts
routes: IRRoute[];
```

An array of routes defined for this resource.

---

### schemaKey

```ts
schemaKey: string;
```

The key of the schema associated with this resource.

---

### schemaProvenance

```ts
schemaProvenance: SchemaProvenance;
```

The provenance of the schema.

---

### warnings

```ts
warnings: IRWarning[];
```

An array of warnings associated with this resource.

---

### blocks?

```ts
optional blocks: IRResourceBlocksConfig;
```

Optional: Generated block configuration (js-only or SSR).

---

### capabilities?

```ts
optional capabilities: Partial<Record<string, string | ResourceCapabilityDescriptor>>;
```

Optional: Inline capability mappings for the resource.

---

### identity?

```ts
optional identity: ResourceIdentityConfig;
```

Optional: Identity configuration for the resource.

---

### queryParams?

```ts
optional queryParams: ResourceQueryParams;
```

Optional: Query parameters configuration for the resource.

---

### storage?

```ts
optional storage: ResourceStorageConfig;
```

Optional: Storage configuration for the resource.

---

### ui?

```ts
optional ui: ResourceUIConfig;
```

Optional: UI configuration for the resource.
