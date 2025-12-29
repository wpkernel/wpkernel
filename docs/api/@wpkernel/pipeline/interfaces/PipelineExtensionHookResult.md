[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineExtensionHookResult

# Interface: PipelineExtensionHookResult<TArtifact>

Result from a pipeline extension hook.

## Type Parameters

### TArtifact

`TArtifact`

## Properties

### artifact?

```ts
readonly optional artifact: TArtifact;
```

---

### commit()?

```ts
readonly optional commit: () => MaybePromise<void>;
```

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)<`void`>

---

### rollback()?

```ts
readonly optional rollback: () => MaybePromise<void>;
```

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)<`void`>
