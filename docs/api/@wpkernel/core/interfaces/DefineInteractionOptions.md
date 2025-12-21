[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / DefineInteractionOptions

# Interface: DefineInteractionOptions&lt;TEntity, TQuery, TStore, TActions&gt;

Options accepted by `defineInteraction`.

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

### TStore

`TStore` *extends* `Record`&lt;`string`, `unknown`&gt;

### TActions

`TActions` *extends* [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md)

## Properties

### feature

```ts
readonly feature: string;
```

***

### resource

```ts
readonly resource: ResourceObject&lt;TEntity, TQuery&gt;;
```

***

### actions?

```ts
readonly optional actions: TActions;
```

***

### autoHydrate?

```ts
readonly optional autoHydrate: boolean;
```

***

### hydrateServerState()?

```ts
readonly optional hydrateServerState: (input) =&gt; void;
```

#### Parameters

##### input

[`HydrateServerStateInput`](HydrateServerStateInput.md)&lt;`TEntity`, `TQuery`&gt;

#### Returns

`void`

***

### namespace?

```ts
readonly optional namespace: string;
```

***

### registry?

```ts
readonly optional registry: any;
```

***

### store?

```ts
readonly optional store: TStore;
```
