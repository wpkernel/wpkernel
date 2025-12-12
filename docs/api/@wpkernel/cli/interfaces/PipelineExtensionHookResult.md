[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineExtensionHookResult

# Interface: PipelineExtensionHookResult

Result returned by a pipeline extension hook.

## Properties

### artifact?

```ts
readonly optional artifact: IRv1;
```

Optional: A modified IR artifact.

---

### commit()?

```ts
readonly optional commit: () => Promise<void>;
```

Optional: A function to commit changes made by the hook.

#### Returns

`Promise`<`void`>

---

### rollback()?

```ts
readonly optional rollback: () => Promise<void>;
```

Optional: A function to rollback changes made by the hook.

#### Returns

`Promise`<`void`>
