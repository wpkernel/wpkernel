[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ResourceControllerCacheEvent

# Interface: ResourceControllerCacheEvent

A resource controller cache event.

## See

ResourceControllerCacheMetadata

## Properties

### operation

```ts
readonly operation: ResourceControllerCacheOperation;
```

The operation of the cache event.

---

### scope

```ts
readonly scope: "list" | "get" | "create" | "update" | "remove" | "custom";
```

The scope of the cache event.

---

### segments

```ts
readonly segments: readonly string[];
```

The cache segments for the event.

---

### description?

```ts
readonly optional description: string;
```

An optional description of the event.
