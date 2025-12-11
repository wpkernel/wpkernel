[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / PipelineRunOptions

# Interface: PipelineRunOptions

Options for running a pipeline.

## Properties

### config

```ts
readonly config: WPKernelConfigV1;
```

The configuration object for the WPKernel project.

***

### generationState

```ts
readonly generationState: GenerationManifest;
```

The state of the code generation process.

***

### namespace

```ts
readonly namespace: string;
```

The namespace of the project.

***

### origin

```ts
readonly origin: string;
```

The origin of the configuration (e.g., 'project', 'workspace').

***

### phase

```ts
readonly phase: PipelinePhase;
```

The current phase of the pipeline execution.

***

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance for logging.

***

### sourcePath

```ts
readonly sourcePath: string;
```

The source path of the configuration file.

***

### workspace

```ts
readonly workspace: Workspace;
```

The current workspace information.
