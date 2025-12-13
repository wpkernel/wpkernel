[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / HydrateServerStateInput

# Interface: HydrateServerStateInput<TEntity, TQuery>

Input shape forwarded to custom hydration callbacks.

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

## Properties

### resource

```ts
readonly resource: ResourceObject<TEntity, TQuery>;
```

---

### serverState

```ts
readonly serverState: object;
```

#### Index Signature

```ts
[key: string]: unknown
```

---

### syncCache

```ts
readonly syncCache: ResourceCacheSync<TEntity>;
```

---

### registry?

```ts
readonly optional registry: any;
```
