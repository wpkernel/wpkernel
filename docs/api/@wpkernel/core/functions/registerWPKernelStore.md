[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / registerWPKernelStore

# Function: registerWPKernelStore()

```ts
function registerWPKernelStore<Key, State, Actions, Selectors>(
	key,
	config
): StoreDescriptor<ReduxStoreConfig<State, Actions, Selectors>>;
```

Register a WordPress data store using WPKernel defaults.

The helper wraps `@wordpress/data` store registration so packages can rely on
consistent middleware ordering and return the created store for further wiring.

## Type Parameters

### Key

`Key` _extends_ `string`

### State

`State`

### Actions

`Actions` _extends_ `Record`<`string`, (...`args`) => `unknown`>

### Selectors

`Selectors`

## Parameters

### key

`Key`

Store key used for registration

### config

`ReduxStoreConfig`<`State`, `Actions`, `Selectors`>

Store configuration passed to `createReduxStore`

## Returns

`StoreDescriptor`<`ReduxStoreConfig`<`State`, `Actions`, `Selectors`>>

Registered WordPress data store
