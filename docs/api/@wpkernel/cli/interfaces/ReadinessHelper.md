[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / ReadinessHelper

# Interface: ReadinessHelper<State>

Contract implemented by readiness helpers.

## Type Parameters

### State

`State` = `unknown`

## Properties

### confirm()

```ts
readonly confirm: (context, state) => Promise<ReadinessConfirmation<State>>;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`<[`ReadinessConfirmation`](ReadinessConfirmation.md)<`State`>>

---

### detect()

```ts
readonly detect: (context) => Promise<ReadinessDetection<State>>;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

#### Returns

`Promise`<[`ReadinessDetection`](ReadinessDetection.md)<`State`>>

---

### key

```ts
readonly key: ReadinessKey;
```

---

### metadata

```ts
readonly metadata: ReadinessHelperMetadata;
```

---

### execute()?

```ts
readonly optional execute: (context, state) => Promise<ReadinessStepResult<State>>;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`<[`ReadinessStepResult`](ReadinessStepResult.md)<`State`>>

---

### prepare()?

```ts
readonly optional prepare: (context, state) => Promise<ReadinessStepResult<State>>;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`<[`ReadinessStepResult`](ReadinessStepResult.md)<`State`>>

---

### rollback()?

```ts
readonly optional rollback: (context, state) => Promise<void>;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`<`void`>
