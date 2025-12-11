[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / PipelineStep

# Interface: PipelineStep&lt;TKind&gt;

A pipeline step representing an executed helper.

## Extends

- [`HelperDescriptor`](HelperDescriptor.md)&lt;`TKind`&gt;

## Type Parameters

### TKind

`TKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`dependsOn`](HelperDescriptor.md#dependson)

***

### id

```ts
readonly id: string;
```

***

### index

```ts
readonly index: number;
```

***

### key

```ts
readonly key: string;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`key`](HelperDescriptor.md#key)

***

### kind

```ts
readonly kind: TKind;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`kind`](HelperDescriptor.md#kind)

***

### mode

```ts
readonly mode: HelperMode;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`mode`](HelperDescriptor.md#mode)

***

### priority

```ts
readonly priority: number;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`priority`](HelperDescriptor.md#priority)

***

### optional?

```ts
readonly optional optional: boolean;
```

Whether this helper is optional and may not execute.
Optional helpers won't cause validation errors if they don't run.
Useful for conditional/feature-flag helpers.

#### Default Value

```ts
false
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`optional`](HelperDescriptor.md#optional)

***

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`origin`](HelperDescriptor.md#origin)
