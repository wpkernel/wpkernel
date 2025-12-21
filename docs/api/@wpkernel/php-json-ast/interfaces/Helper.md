[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / Helper

# Interface: Helper&lt;TContext, TInput, TOutput, TReporter, TKind&gt;

A complete pipeline helper with descriptor and apply function.

## Extends

- [`HelperDescriptor`](HelperDescriptor.md)&lt;`TKind`&gt;

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

### TReporter

`TReporter` *extends* `PipelineReporter` = `PipelineReporter`

### TKind

`TKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### apply

```ts
readonly apply: HelperApplyFn&lt;TContext, TInput, TOutput, TReporter&gt;;
```

***

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`dependsOn`](HelperDescriptor.md#dependson)

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
