[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / PipelineRunResult

# Interface: PipelineRunResult

The result of a pipeline run.

## Properties

### diagnostics

```ts
readonly diagnostics: readonly PipelineDiagnostic[];
```

An array of diagnostic messages.

***

### ir

```ts
readonly ir: IRv1;
```

The generated Intermediate Representation (IR).

***

### steps

```ts
readonly steps: readonly PipelineStep[];
```

An array of executed pipeline steps.
