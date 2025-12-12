[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / StoreUtils

# Type Alias: StoreUtils<T>

```ts
type StoreUtils<T> = object;
```

Store utilities for waiting on resolvers and state

## Type Parameters

### T

`T` = `unknown`

## Properties

### getState()

```ts
getState: () => Promise<T>;
```

Get current store state

#### Returns

`Promise`<`T`>

Current state object

---

### invalidate()

```ts
invalidate: () => Promise<void>;
```

Invalidate store cache to trigger refetch

#### Returns

`Promise`<`void`>

---

### wait()

```ts
wait: <R>(selector, timeout?) => Promise<R>;
```

Wait for store selector to return truthy value

#### Type Parameters

##### R

`R`

#### Parameters

##### selector

(`state`) => `R`

Function that receives store state and returns data

##### timeout?

`number`

Max wait time in ms (default: 5000)

#### Returns

`Promise`<`R`>

Resolved data from selector
