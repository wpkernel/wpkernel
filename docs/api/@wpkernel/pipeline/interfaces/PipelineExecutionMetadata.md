[**@wpkernel/pipeline v0.12.6-beta.0**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineExecutionMetadata

# Interface: PipelineExecutionMetadata&lt;TFragmentKind, TBuilderKind&gt;

Complete execution metadata for all helper phases.

## Extends

- [`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)&lt;`TFragmentKind`&gt;

## Type Parameters

### TFragmentKind

`TFragmentKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

### TBuilderKind

`TBuilderKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### builders

```ts
readonly builders: HelperExecutionSnapshot&lt;TBuilderKind&gt;;
```

***

### fragments

```ts
readonly fragments: HelperExecutionSnapshot&lt;TFragmentKind&gt;;
```

#### Inherited from

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md).[`fragments`](FragmentFinalizationMetadata.md#fragments)
