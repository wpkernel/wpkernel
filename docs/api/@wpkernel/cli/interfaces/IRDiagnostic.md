[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / IRDiagnostic

# Interface: IRDiagnostic

Represents an Intermediate Representation (IR) for a diagnostic message.

## Properties

### code

```ts
code: string;
```

Canonical diagnostic code.

***

### message

```ts
message: string;
```

The diagnostic message.

***

### severity

```ts
severity: IRDiagnosticSeverity;
```

The severity of the diagnostic.

***

### hint?

```ts
optional hint: string;
```

Optional: Suggested hint for resolving the diagnostic.

***

### source?

```ts
optional source: string;
```

Optional: Source that emitted the diagnostic (fragment, adapter, etc.).

***

### target?

```ts
optional target: IRDiagnosticTarget;
```

Optional: Entity the diagnostic refers to.
