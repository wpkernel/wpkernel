[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineExtensionHookResult

# Interface: PipelineExtensionHookResult&lt;TArtifact&gt;

Result from a pipeline extension hook.

## Type Parameters

### TArtifact

`TArtifact`

## Properties

### artifact?

```ts
readonly optional artifact: TArtifact;
```

***

### commit()?

```ts
readonly optional commit: () =&gt; MaybePromise&lt;void&gt;;
```

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)&lt;`void`&gt;

***

### rollback()?

```ts
readonly optional rollback: () =&gt; MaybePromise&lt;void&gt;;
```

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)&lt;`void`&gt;
