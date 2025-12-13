[**@wpkernel/pipeline v0.12.6-beta.0**](../README.md)

***

[@wpkernel/pipeline](../README.md) / UnusedHelperDiagnostic

# Interface: UnusedHelperDiagnostic&lt;TKind&gt;

Diagnostic for unused helpers.

## Type Parameters

### TKind

`TKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

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
readonly type: "unused-helper";
```

***

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
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
