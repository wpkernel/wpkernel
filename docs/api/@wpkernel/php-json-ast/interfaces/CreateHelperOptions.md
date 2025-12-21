[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / CreateHelperOptions

# Interface: CreateHelperOptions&lt;TContext, TInput, TOutput, TReporter, TKind&gt;

Options for creating a new helper.

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

### key

```ts
readonly key: string;
```

***

### kind

```ts
readonly kind: TKind;
```

***

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

***

### mode?

```ts
readonly optional mode: HelperMode;
```

***

### origin?

```ts
readonly optional origin: string;
```

***

### priority?

```ts
readonly optional priority: number;
```
