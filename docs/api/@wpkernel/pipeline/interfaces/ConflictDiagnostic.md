[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / ConflictDiagnostic

# Interface: ConflictDiagnostic&lt;TKind&gt;

Diagnostic for conflicting helper registrations.

## Type Parameters

### TKind

`TKind` *extends* [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### helpers

```ts
readonly helpers: readonly string[];
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

### mode

```ts
readonly mode: HelperMode;
```

***

### type

```ts
readonly type: "conflict";
```

***

### kind?

```ts
readonly optional kind: TKind;
```
