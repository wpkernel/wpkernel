[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineExecutionMetadata

# Interface: PipelineExecutionMetadata<TFragmentKind, TBuilderKind>

Complete execution metadata for all helper phases.

## Extends

- [`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)<`TFragmentKind`>

## Type Parameters

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### builders

```ts
readonly builders: HelperExecutionSnapshot<TBuilderKind>;
```

---

### fragments

```ts
readonly fragments: HelperExecutionSnapshot<TFragmentKind>;
```

#### Inherited from

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md).[`fragments`](FragmentFinalizationMetadata.md#fragments)
