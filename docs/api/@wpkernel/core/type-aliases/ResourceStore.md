[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / ResourceStore

# Type Alias: ResourceStore&lt;T, TQuery&gt;

```ts
type ResourceStore&lt;T, TQuery&gt; = object;
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
actions: ResourceActions&lt;T&gt;;
```

State actions.

***

### initialState

```ts
initialState: ResourceState&lt;T&gt;;
```

Initial state.

***

### reducer()

```ts
reducer: (state, action) =&gt; ResourceState&lt;T&gt;;
```

Reducer function for state updates.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)&lt;`T`&gt; | `undefined`

##### action

`unknown`

#### Returns

[`ResourceState`](ResourceState.md)&lt;`T`&gt;

***

### resolvers

```ts
resolvers: ResourceResolvers&lt;T, TQuery&gt;;
```

Resolvers for async data fetching.

***

### selectors

```ts
selectors: ResourceSelectors&lt;T, TQuery&gt;;
```

State selectors.

***

### storeKey

```ts
storeKey: string;
```

Store key for registration with @wordpress/data.

***

### controls?

```ts
optional controls: Record&lt;string, (action) =&gt; unknown&gt;;
```

Controls for handling async operations in generators.
