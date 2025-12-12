[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / ReadinessHelperFactoryContext

# Interface: ReadinessHelperFactoryContext

## Properties

### createHelper()

```ts
readonly createHelper: <State>(helper) => ReadinessHelper<State>;
```

Creates an immutable readiness helper definition.

#### Type Parameters

##### State

`State`

#### Parameters

##### helper

[`ReadinessHelper`](ReadinessHelper.md)<`State`>

#### Returns

[`ReadinessHelper`](ReadinessHelper.md)<`State`>

---

### register()

```ts
readonly register: (helper) => void;
```

#### Parameters

##### helper

[`ReadinessHelper`](ReadinessHelper.md)

#### Returns

`void`

---

### registry

```ts
readonly registry: ReadinessRegistry;
```
