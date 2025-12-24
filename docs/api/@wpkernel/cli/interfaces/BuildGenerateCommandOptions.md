[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

***

[@wpkernel/cli](../README.md) / BuildGenerateCommandOptions

# Interface: BuildGenerateCommandOptions

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) =&gt; Reporter;
```

Create a WPKernel reporter backed by LogLayer transports.

This is the standard reporter for browser/WordPress environments.
For CLI environments, use `createReporterCLI()` for pretty terminal output.

##### Parameters

###### options

`ReporterOptions` = `{}`

Reporter configuration

##### Returns

`Reporter`

Reporter instance with child helpers

### IR

#### registerBuilders()?

```ts
readonly optional registerBuilders: (pipeline) =&gt; void;
```

Registers the core builders with the pipeline.

These builders are responsible for taking the Intermediate Representation
and generating various output artifacts (e.g., PHP, TypeScript, bundles).

##### Parameters

###### pipeline

[`Pipeline`](../type-aliases/Pipeline.md)

The pipeline instance to register builders with.

##### Returns

`void`

***

#### registerFragments()?

```ts
readonly optional registerFragments: (pipeline) =&gt; void;
```

Registers the core IR fragments with the pipeline.

These fragments are responsible for extracting various pieces of information
from the configuration and building up the Intermediate Representation.

##### Parameters

###### pipeline

[`Pipeline`](../type-aliases/Pipeline.md)

The pipeline instance to register fragments with.

##### Returns

`void`

### Other

#### buildAdapterExtensionsExtension()?

```ts
readonly optional buildAdapterExtensionsExtension: () =&gt; PipelineExtension;
```

##### Returns

[`PipelineExtension`](../type-aliases/PipelineExtension.md)

***

#### buildReadinessRegistry()?

```ts
readonly optional buildReadinessRegistry: (options?) =&gt; ReadinessRegistry;
```

##### Parameters

###### options?

[`BuildDefaultReadinessRegistryOptions`](BuildDefaultReadinessRegistryOptions.md)

##### Returns

[`ReadinessRegistry`](../classes/ReadinessRegistry.md)

***

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) =&gt; Workspace;
```

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

***

#### createPipeline()?

```ts
readonly optional createPipeline: (overrides) =&gt; Pipeline;
```

##### Parameters

###### overrides

`Partial`&lt;`CliPipelineOptions`&gt; = `{}`

##### Returns

[`Pipeline`](../type-aliases/Pipeline.md)

***

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: (options?) =&gt; Promise&lt;LoadedWPKernelConfig&gt;;
```

Locate and load the project's wpk configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure, and returns the
canonicalised configuration metadata.

##### Parameters

###### options?

###### cwd?

`string`

##### Returns

`Promise`&lt;[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)&gt;

The validated wpk config and associated metadata.

##### Throws

WPKernelError when discovery, parsing or validation fails.

***

#### renderSummary()?

```ts
readonly optional renderSummary: (summary, dryRun, verbose, paths?) =&gt; string;
```

##### Parameters

###### summary

[`FileWriterSummary`](FileWriterSummary.md)

###### dryRun

`boolean`

###### verbose

`boolean`

###### paths?

###### entry

`string`

###### php

`string`

###### runtime

`string`

###### blocks?

`string`

##### Returns

`string`

***

#### validateGeneratedImports()?

```ts
readonly optional validateGeneratedImports: (__namedParameters) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### \_\_namedParameters

[`ValidateGeneratedImportsOptions`](ValidateGeneratedImportsOptions.md)

##### Returns

`Promise`&lt;`void`&gt;
