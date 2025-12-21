[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / HelperDescriptor

# Interface: HelperDescriptor&lt;TKind&gt;

Base descriptor for a pipeline helper.

## Extended by

- [`Helper`](Helper.md)

## Type Parameters

### TKind

`TKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### dependsOn

```ts
readonly dependsOn: readonly string[];
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

### mode

```ts
readonly mode: HelperMode;
```

***

### priority

```ts
readonly priority: number;
```

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

***

### origin?

```ts
readonly optional origin: string;
```
