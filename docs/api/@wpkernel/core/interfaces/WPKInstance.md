[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / WPKInstance

# Interface: WPKInstance

## Properties

### attachUIBindings()

```ts
attachUIBindings: (attach, options?) => WPKernelUIRuntime;
```

#### Parameters

##### attach

[`WPKernelUIAttach`](../type-aliases/WPKernelUIAttach.md)

##### options?

[`UIIntegrationOptions`](UIIntegrationOptions.md)

#### Returns

[`WPKernelUIRuntime`](WPKernelUIRuntime.md)

---

### defineResource()

```ts
defineResource: <T, TQuery>(config) => ResourceObject<T, TQuery>;
```

#### Type Parameters

##### T

`T` = `unknown`

##### TQuery

`TQuery` = `unknown`

#### Parameters

##### config

[`ResourceConfig`](../type-aliases/ResourceConfig.md)<`T`, `TQuery`>

#### Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)<`T`, `TQuery`>

---

### emit()

```ts
emit: (eventName, payload) => void;
```

#### Parameters

##### eventName

`string`

##### payload

`unknown`

#### Returns

`void`

---

### events

```ts
events: WPKernelEventBus;
```

---

### getNamespace()

```ts
getNamespace: () => string;
```

#### Returns

`string`

---

### getRegistry()

```ts
getRegistry: () => any;
```

#### Returns

`any`

---

### getReporter()

```ts
getReporter: () => Reporter;
```

#### Returns

[`Reporter`](../type-aliases/Reporter.md)

---

### getUIRuntime()

```ts
getUIRuntime: () => WPKernelUIRuntime | undefined;
```

#### Returns

[`WPKernelUIRuntime`](WPKernelUIRuntime.md) \| `undefined`

---

### hasUIRuntime()

```ts
hasUIRuntime: () => boolean;
```

#### Returns

`boolean`

---

### invalidate()

```ts
invalidate: (patterns, options?) => void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../type-aliases/InvalidateOptions.md)

#### Returns

`void`

---

### teardown()

```ts
teardown: () => void;
```

#### Returns

`void`

---

### ui

```ts
ui: object;
```

#### isEnabled()

```ts
isEnabled: () => boolean;
```

##### Returns

`boolean`

#### options?

```ts
optional options: UIIntegrationOptions;
```
