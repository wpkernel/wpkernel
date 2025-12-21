[**@wpkernel/core v0.12.6-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / WPKInstance

# Interface: WPKInstance

## Properties

### attachUIBindings()

```ts
attachUIBindings: (attach, options?) =&gt; WPKernelUIRuntime;
```

#### Parameters

##### attach

[`WPKernelUIAttach`](../type-aliases/WPKernelUIAttach.md)

##### options?

[`UIIntegrationOptions`](UIIntegrationOptions.md)

#### Returns

[`WPKernelUIRuntime`](WPKernelUIRuntime.md)

***

### defineResource()

```ts
defineResource: &lt;T, TQuery&gt;(config) =&gt; ResourceObject&lt;T, TQuery&gt;;
```

#### Type Parameters

##### T

`T` = `unknown`

##### TQuery

`TQuery` = `unknown`

#### Parameters

##### config

[`ResourceConfig`](../type-aliases/ResourceConfig.md)&lt;`T`, `TQuery`&gt;

#### Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)&lt;`T`, `TQuery`&gt;

***

### emit()

```ts
emit: (eventName, payload) =&gt; void;
```

#### Parameters

##### eventName

`string`

##### payload

`unknown`

#### Returns

`void`

***

### events

```ts
events: WPKernelEventBus;
```

***

### getNamespace()

```ts
getNamespace: () =&gt; string;
```

#### Returns

`string`

***

### getRegistry()

```ts
getRegistry: () =&gt; any;
```

#### Returns

`any`

***

### getReporter()

```ts
getReporter: () =&gt; Reporter;
```

#### Returns

[`Reporter`](../type-aliases/Reporter.md)

***

### getUIRuntime()

```ts
getUIRuntime: () =&gt; WPKernelUIRuntime | undefined;
```

#### Returns

[`WPKernelUIRuntime`](WPKernelUIRuntime.md) \| `undefined`

***

### hasUIRuntime()

```ts
hasUIRuntime: () =&gt; boolean;
```

#### Returns

`boolean`

***

### invalidate()

```ts
invalidate: (patterns, options?) =&gt; void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../type-aliases/InvalidateOptions.md)

#### Returns

`void`

***

### teardown()

```ts
teardown: () =&gt; void;
```

#### Returns

`void`

***

### ui

```ts
ui: object;
```

#### isEnabled()

```ts
isEnabled: () =&gt; boolean;
```

##### Returns

`boolean`

#### options?

```ts
optional options: UIIntegrationOptions;
```
