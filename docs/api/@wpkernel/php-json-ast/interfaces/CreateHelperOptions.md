[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / CreateHelperOptions

# Interface: CreateHelperOptions<TContext, TInput, TOutput, TReporter, TKind>

Options for creating a new helper.

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### apply

```ts
readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
```

---

### key

```ts
readonly key: string;
```

---

### kind

```ts
readonly kind: TKind;
```

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

---

### mode?

```ts
readonly optional mode: HelperMode;
```

---

### origin?

```ts
readonly optional origin: string;
```

---

### priority?

```ts
readonly optional priority: number;
```
