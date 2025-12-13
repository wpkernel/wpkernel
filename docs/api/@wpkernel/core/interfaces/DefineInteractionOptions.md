[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / DefineInteractionOptions

# Interface: DefineInteractionOptions<TEntity, TQuery, TStore, TActions>

Options accepted by `defineInteraction`.

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

### TStore

`TStore` _extends_ `Record`<`string`, `unknown`>

### TActions

`TActions` _extends_ [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md)

## Properties

### feature

```ts
readonly feature: string;
```

---

### resource

```ts
readonly resource: ResourceObject<TEntity, TQuery>;
```

---

### actions?

```ts
readonly optional actions: TActions;
```

---

### autoHydrate?

```ts
readonly optional autoHydrate: boolean;
```

---

### hydrateServerState()?

```ts
readonly optional hydrateServerState: (input) => void;
```

#### Parameters

##### input

[`HydrateServerStateInput`](HydrateServerStateInput.md)<`TEntity`, `TQuery`>

#### Returns

`void`

---

### namespace?

```ts
readonly optional namespace: string;
```

---

### registry?

```ts
readonly optional registry: any;
```

---

### store?

```ts
readonly optional store: TStore;
```
