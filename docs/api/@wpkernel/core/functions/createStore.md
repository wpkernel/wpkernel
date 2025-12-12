[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / createStore

# Function: createStore()

```ts
function createStore<T, TQuery>(config): ResourceStore<T, TQuery>;
```

Creates a resource store with selectors, actions, and resolvers.

## Type Parameters

### T

`T`

The resource entity type

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations

## Parameters

### config

[`ResourceStoreConfig`](../type-aliases/ResourceStoreConfig.md)<`T`, `TQuery`>

Store configuration

## Returns

[`ResourceStore`](../type-aliases/ResourceStore.md)<`T`, `TQuery`>

Complete store descriptor

## Example

```typescript
import { createStore } from '@wpkernel/core/resource';
import { thing } from './resources/thing';

const thingStore = createStore({
  resource: thing,
  getId: (item) => item.id,
});
```
