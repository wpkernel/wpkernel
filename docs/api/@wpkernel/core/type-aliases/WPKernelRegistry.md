[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / WPKernelRegistry

# Type Alias: WPKernelRegistry

```ts
type WPKernelRegistry = WPDataRegistry & object;
```

## Type Declaration

### dispatch()

```ts
dispatch: (storeName) => unknown;
```

#### Parameters

##### storeName

`string`

#### Returns

`unknown`

### \_\_experimentalUseMiddleware()?

```ts
optional __experimentalUseMiddleware: (middleware) => () => void | void;
```

#### Parameters

##### middleware

() => [`ReduxMiddleware`](ReduxMiddleware.md)[]

#### Returns

() => `void` \| `void`
