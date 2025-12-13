[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildCreateCommandOptions

# Interface: BuildCreateCommandOptions

Options for building the `create` command.

## Properties

### Workspace

#### ensureCleanDirectory()?

```ts
readonly optional ensureCleanDirectory: (options) => Promise<void>;
```

Optional: Custom clean directory enforcer function.

Ensures that a given directory is clean (empty) or creates it if it doesn't exist.

If the directory exists and is not empty, it will throw a `WPKernelError`
unless `force` is true, in which case it will clear the directory contents.

##### Parameters

###### options

[`EnsureCleanDirectoryOptions`](EnsureCleanDirectoryOptions.md)

Options for ensuring the directory is clean.

##### Returns

`Promise`<`void`>

##### Throws

`WPKernelError` if the directory is not empty and `force` is false, or if it's not a directory.

### Other

#### buildReadinessRegistry()?

```ts
readonly optional buildReadinessRegistry: (options?) => ReadinessRegistry;
```

Optional: Custom readiness registry builder.

##### Parameters

###### options?

[`BuildDefaultReadinessRegistryOptions`](BuildDefaultReadinessRegistryOptions.md)

##### Returns

[`ReadinessRegistry`](../classes/ReadinessRegistry.md)

---

#### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Optional: Custom reporter builder function.

##### Parameters

###### options

`ReporterOptions` = `{}`

##### Returns

`Reporter`

---

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

Optional: Custom workspace builder function.

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

---

#### installComposerDependencies()?

```ts
readonly optional installComposerDependencies: (cwd, dependencies, options) => Promise<InstallerResult>;
```

Optional: Custom Composer dependency installer function.

##### Parameters

###### cwd

`string`

###### dependencies

[`InstallerDependencies`](InstallerDependencies.md) = `{}`

###### options

`InstallerRunOptions` = `{}`

##### Returns

`Promise`<`InstallerResult`>

---

#### installNodeDependencies()?

```ts
readonly optional installNodeDependencies: (cwd, packageManager, dependencies, options) => Promise<InstallerResult>;
```

Optional: Custom Node.js dependency installer function.

##### Parameters

###### cwd

`string`

###### packageManager

`PackageManager`

###### dependencies

[`InstallerDependencies`](InstallerDependencies.md) = `{}`

###### options

`InstallerRunOptions` = `{}`

##### Returns

`Promise`<`InstallerResult`>

---

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
```

Optional: Custom kernel config loader.

##### Returns

`Promise`<[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)>

---

#### runWorkflow()?

```ts
readonly optional runWorkflow: (options) => Promise<InitWorkflowResult>;
```

Optional: Custom workflow runner function.

##### Parameters

###### options

[`InitWorkflowOptions`](InitWorkflowOptions.md)

##### Returns

`Promise`<[`InitWorkflowResult`](InitWorkflowResult.md)>
