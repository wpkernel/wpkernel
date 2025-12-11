[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / PipelineContext

# Interface: PipelineContext

Context object passed through the entire pipeline execution.

## Extends

- `Omit`&lt;`BasePipelineContext`, `"workspace"`&gt;

## Properties

### generationState

```ts
readonly generationState: GenerationManifest;
```

The state of the code generation process.

***

### phase

```ts
readonly phase: PipelinePhase;
```

#### Inherited from

```ts
Omit.phase
```

***

### reporter

```ts
readonly reporter: Reporter;
```

#### Inherited from

```ts
Omit.reporter
```

***

### workspace

```ts
readonly workspace: Workspace;
```

The current workspace information.
