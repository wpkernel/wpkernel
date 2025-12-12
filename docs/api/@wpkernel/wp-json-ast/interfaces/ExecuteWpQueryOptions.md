[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ExecuteWpQueryOptions

# Interface: ExecuteWpQueryOptions

## Properties

### argsVariable

```ts
readonly argsVariable: string;
```

---

### target

```ts
readonly target: string;
```

---

### cache?

```ts
readonly optional cache: object;
```

#### host

```ts
readonly host: ResourceMetadataHost;
```

#### operation

```ts
readonly operation: ResourceControllerCacheOperation;
```

#### scope

```ts
readonly scope: "list" | "get" | "create" | "update" | "remove" | "custom";
```

#### segments

```ts
readonly segments: readonly unknown[];
```

#### description?

```ts
readonly optional description: string;
```

---

### indentLevel?

```ts
readonly optional indentLevel: number;
```
