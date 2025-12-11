[**@wpkernel/core v0.12.3-beta.1**](../README.md)

***

[@wpkernel/core](../README.md) / CapabilityHelpers

# Type Alias: CapabilityHelpers&lt;K&gt;

```ts
type CapabilityHelpers&lt;K&gt; = object;
```

Runtime helpers exposed by `defineCapability()`.

## Type Parameters

### K

`K` *extends* `Record`&lt;`string`, `unknown`&gt;

## Properties

### assert()

```ts
assert: &lt;Key&gt;(key, ...params) =&gt; void | Promise&lt;void&gt;;
```

#### Type Parameters

##### Key

`Key` *extends* keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](ParamsOf.md)&lt;`K`, `Key`&gt;

#### Returns

`void` \| `Promise`&lt;`void`&gt;

***

### cache

```ts
readonly cache: CapabilityCache;
```

***

### can()

```ts
can: &lt;Key&gt;(key, ...params) =&gt; boolean | Promise&lt;boolean&gt;;
```

#### Type Parameters

##### Key

`Key` *extends* keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](ParamsOf.md)&lt;`K`, `Key`&gt;

#### Returns

`boolean` \| `Promise`&lt;`boolean`&gt;

***

### extend()

```ts
extend: (additionalMap) =&gt; void;
```

#### Parameters

##### additionalMap

`Partial`&lt;[`CapabilityMap`](CapabilityMap.md)&lt;`K`&gt;&gt;

#### Returns

`void`

***

### keys()

```ts
keys: () =&gt; keyof K[];
```

#### Returns

keyof `K`[]
