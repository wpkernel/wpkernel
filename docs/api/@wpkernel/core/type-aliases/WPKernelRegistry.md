[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / WPKernelRegistry

# Type Alias: WPKernelRegistry

```ts
type WPKernelRegistry = WPDataRegistry & object;
```

## Type Declaration

### dispatch()

```ts
dispatch: (storeName) =&gt; unknown;
```

#### Parameters

##### storeName

`string`

#### Returns

`unknown`

### \_\_experimentalUseMiddleware()?

```ts
optional __experimentalUseMiddleware: (middleware) =&gt; () =&gt; void | void;
```

#### Parameters

##### middleware

() =&gt; [`ReduxMiddleware`](ReduxMiddleware.md)[]

#### Returns

() =&gt; `void` \| `void`
