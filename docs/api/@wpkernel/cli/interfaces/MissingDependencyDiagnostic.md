[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / MissingDependencyDiagnostic

# Interface: MissingDependencyDiagnostic

Diagnostic emitted when a required helper dependency is missing.

## Properties

### dependency

```ts
readonly dependency: string;
```

Identifier of the missing dependency helper.

***

### key

```ts
readonly key: string;
```

The key of the helper emitting the diagnostic.

***

### message

```ts
readonly message: string;
```

A descriptive message about the missing dependency.

***

### type

```ts
readonly type: "missing-dependency";
```

The type of diagnostic, always 'missing-dependency'.

***

### helper?

```ts
readonly optional helper: string;
```

Optional helper key associated with the dependency.

***

### kind?

```ts
readonly optional kind: string;
```

Helper kind associated with the diagnostic.
