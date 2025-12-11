[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / StoreUtils

# Type Alias: StoreUtils&lt;T&gt;

```ts
type StoreUtils&lt;T&gt; = object;
```

Store utilities for waiting on resolvers and state

## Type Parameters

### T

`T` = `unknown`

## Properties

### getState()

```ts
getState: () =&gt; Promise&lt;T&gt;;
```

Get current store state

#### Returns

`Promise`&lt;`T`&gt;

Current state object

***

### invalidate()

```ts
invalidate: () =&gt; Promise&lt;void&gt;;
```

Invalidate store cache to trigger refetch

#### Returns

`Promise`&lt;`void`&gt;

***

### wait()

```ts
wait: &lt;R&gt;(selector, timeout?) =&gt; Promise&lt;R&gt;;
```

Wait for store selector to return truthy value

#### Type Parameters

##### R

`R`

#### Parameters

##### selector

(`state`) =&gt; `R`

Function that receives store state and returns data

##### timeout?

`number`

Max wait time in ms (default: 5000)

#### Returns

`Promise`&lt;`R`&gt;

Resolved data from selector
