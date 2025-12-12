[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / BuildDoctorCommandOptions

# Interface: BuildDoctorCommandOptions

Options for building the `doctor` command, allowing for dependency injection.

## Properties

### buildReadinessRegistry()?

```ts
readonly optional buildReadinessRegistry: (options) =&gt; ReadinessRegistry;
```

Optional: Custom readiness registry builder.

#### Parameters

##### options

[`BuildDefaultReadinessRegistryOptions`](BuildDefaultReadinessRegistryOptions.md) = `{}`

#### Returns

[`ReadinessRegistry`](../classes/ReadinessRegistry.md)

***

### buildReporter()?

```ts
readonly optional buildReporter: (options) =&gt; Reporter;
```

Optional: Custom reporter builder function.

#### Parameters

##### options

`ReporterOptions` = `{}`

#### Returns

`Reporter`

***

### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) =&gt; Workspace;
```

Optional: Custom workspace builder function.

#### Parameters

##### root

`string` = `...`

#### Returns

[`Workspace`](Workspace.md)

***

### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: (options?) =&gt; Promise&lt;LoadedWPKernelConfig&gt;;
```

Optional: Custom function to load the WPKernel configuration.

Locate and load the project's wpk configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure, and returns the
canonicalised configuration metadata.

#### Parameters

##### options?

###### cwd?

`string`

#### Returns

`Promise`&lt;[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)&gt;

The validated wpk config and associated metadata.

#### Throws

WPKernelError when discovery, parsing or validation fails.
