[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityHelpers

# Type Alias: CapabilityHelpers<K>

```ts
type CapabilityHelpers<K> = object;
```

Runtime helpers exposed by `defineCapability()`.

## Type Parameters

### K

`K` _extends_ `Record`<`string`, `unknown`>

## Properties

### assert()

```ts
assert: <Key>(key, ...params) => void | Promise<void>;
```

#### Type Parameters

##### Key

`Key` _extends_ keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](ParamsOf.md)<`K`, `Key`>

#### Returns

`void` \| `Promise`<`void`>

---

### cache

```ts
readonly cache: CapabilityCache;
```

---

### can()

```ts
can: <Key>(key, ...params) => boolean | Promise<boolean>;
```

#### Type Parameters

##### Key

`Key` _extends_ keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](ParamsOf.md)<`K`, `Key`>

#### Returns

`boolean` \| `Promise`<`boolean`>

---

### extend()

```ts
extend: (additionalMap) => void;
```

#### Parameters

##### additionalMap

`Partial`<[`CapabilityMap`](CapabilityMap.md)<`K`>>

#### Returns

`void`

---

### keys()

```ts
keys: () => keyof K[];
```

#### Returns

keyof `K`[]
