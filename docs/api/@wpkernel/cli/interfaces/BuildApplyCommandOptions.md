[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / BuildApplyCommandOptions

# Interface: BuildApplyCommandOptions

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

### AST Builders

#### createPatcher()?

```ts
readonly optional createPatcher: () =&gt; BuilderHelper;
```

Creates a builder helper for applying patches to the workspace.

This helper reads a patch plan, applies file modifications (writes, merges, deletions)
based on the plan, and records the outcome in a patch manifest.
It uses `git merge-file` for intelligent three-way merges to handle conflicts.

##### Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for applying patches.

### Other

#### appendApplyLog()?

```ts
readonly optional appendApplyLog: (workspace, entry) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

###### entry

[`ApplyLogEntry`](ApplyLogEntry.md)

##### Returns

`Promise`&lt;`void`&gt;

***

#### buildBuilderOutput()?

```ts
readonly optional buildBuilderOutput: () =&gt; BuilderOutput;
```

##### Returns

`BuilderOutput`

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

`string`

##### Returns

[`Workspace`](Workspace.md)

***

#### createBackups()?

```ts
readonly optional createBackups: (options) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### options

[`CreateBackupsOptions`](CreateBackupsOptions.md)

##### Returns

`Promise`&lt;`void`&gt;

***

#### ensureGitRepository()?

```ts
readonly optional ensureGitRepository: (workspace) =&gt; Promise&lt;void&gt;;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`&lt;`void`&gt;

***

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () =&gt; Promise&lt;LoadedWPKernelConfig&gt;;
```

##### Returns

`Promise`&lt;[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)&gt;

***

#### promptConfirm()?

```ts
readonly optional promptConfirm: (options) =&gt; Promise&lt;boolean&gt;;
```

##### Parameters

###### options

###### defaultValue

`boolean`

###### input

`ReadableStream`

###### message

`string`

###### output

`WritableStream`

##### Returns

`Promise`&lt;`boolean`&gt;

***

#### readManifest()?

```ts
readonly optional readManifest: (workspace) =&gt; Promise&lt;PatchManifest | null&gt;;
```

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

##### Returns

`Promise`&lt;[`PatchManifest`](PatchManifest.md) \| `null`&gt;

***

#### resolveWorkspaceRoot()?

```ts
readonly optional resolveWorkspaceRoot: (loaded) =&gt; string;
```

##### Parameters

###### loaded

[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)

##### Returns

`string`
