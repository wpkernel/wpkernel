[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / MissingDependencyDiagnostic

# Interface: MissingDependencyDiagnostic&lt;TKind&gt;

Diagnostic for missing helper dependencies.

## Type Parameters

### TKind

`TKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### dependency

```ts
readonly dependency: string;
```

***

### key

```ts
readonly key: string;
```

***

### message

```ts
readonly message: string;
```

***

### type

```ts
readonly type: "missing-dependency";
```

***

### helper?

```ts
readonly optional helper: string;
```

***

### kind?

```ts
readonly optional kind: TKind;
```
