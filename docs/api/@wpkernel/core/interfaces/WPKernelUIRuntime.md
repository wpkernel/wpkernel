[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / WPKernelUIRuntime

# Interface: WPKernelUIRuntime

## Properties

### events

```ts
events: WPKernelEventBus;
```

***

### namespace

```ts
namespace: string;
```

***

### reporter

```ts
reporter: Reporter;
```

***

### capabilities?

```ts
optional capabilities: WPKUICapabilityRuntime;
```

***

### dataviews?

```ts
optional dataviews: WPKernelDataViewsRuntime;
```

***

### invalidate()?

```ts
optional invalidate: (patterns, options?) =&gt; void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../type-aliases/InvalidateOptions.md)

#### Returns

`void`

***

### options?

```ts
optional options: UIIntegrationOptions;
```

***

### registry?

```ts
optional registry: any;
```

***

### wpk?

```ts
optional wpk: WPKInstance;
```
