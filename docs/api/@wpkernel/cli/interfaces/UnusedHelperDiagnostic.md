[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / UnusedHelperDiagnostic

# Interface: UnusedHelperDiagnostic

Union of all diagnostics emitted by the pipeline.

## Properties

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

A descriptive message about the unused helper.

***

### type

```ts
readonly type: "unused-helper";
```

The type of diagnostic, always 'unused-helper'.

***

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

Dependency list used when determining helper usage.

***

### helper?

```ts
readonly optional helper: string;
```

Optional helper key flagged as unused.

***

### kind?

```ts
readonly optional kind: string;
```

Helper kind associated with the diagnostic.
