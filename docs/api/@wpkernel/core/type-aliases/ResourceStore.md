[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceStore

# Type Alias: ResourceStore<T, TQuery>

```ts
type ResourceStore<T, TQuery> = object;
```

Complete store descriptor returned by createStore.

## Type Parameters

### T

`T`

The resource entity type

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations

## Properties

### actions

```ts
actions: ResourceActions & lt;
T & gt;
```

State actions.

---

### initialState

```ts
initialState: ResourceState & lt;
T & gt;
```

Initial state.

---

### reducer()

```ts
reducer: (state, action) => ResourceState<T>;
```

Reducer function for state updates.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)<`T`> | `undefined`

##### action

`unknown`

#### Returns

[`ResourceState`](ResourceState.md)<`T`>

---

### resolvers

```ts
resolvers: ResourceResolvers & lt;
(T, TQuery & gt);
```

Resolvers for async data fetching.

---

### selectors

```ts
selectors: ResourceSelectors & lt;
(T, TQuery & gt);
```

State selectors.

---

### storeKey

```ts
storeKey: string;
```

Store key for registration with @wordpress/data.

---

### controls?

```ts
optional controls: Record<string, (action) => unknown>;
```

Controls for handling async operations in generators.
