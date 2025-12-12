[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / MissingDependencyDiagnostic

# Interface: MissingDependencyDiagnostic<TKind>

Diagnostic for missing helper dependencies.

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### dependency

```ts
readonly dependency: string;
```

---

### key

```ts
readonly key: string;
```

---

### message

```ts
readonly message: string;
```

---

### type

```ts
readonly type: "missing-dependency";
```

---

### helper?

```ts
readonly optional helper: string;
```

---

### kind?

```ts
readonly optional kind: TKind;
```
