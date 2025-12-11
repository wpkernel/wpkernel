[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildInitCommandOptions

# Interface: BuildInitCommandOptions

Options for building the `init` command.

## Properties

### buildReadinessRegistry()?

```ts
readonly optional buildReadinessRegistry: (options?) => ReadinessRegistry;
```

Optional: Custom readiness registry builder.

#### Parameters

##### options?

[`BuildDefaultReadinessRegistryOptions`](BuildDefaultReadinessRegistryOptions.md)

#### Returns

[`ReadinessRegistry`](../classes/ReadinessRegistry.md)

---

### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Optional: Custom reporter builder function.

#### Parameters

##### options

`ReporterOptions` = `{}`

#### Returns

`Reporter`

---

### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

Optional: Custom workspace builder function.

#### Parameters

##### root

`string` = `...`

#### Returns

[`Workspace`](Workspace.md)

---

### checkGitRepository()?

```ts
readonly optional checkGitRepository: (cwd, __namedParameters) => Promise<boolean>;
```

Optional: Custom git repository checker function.

#### Parameters

##### cwd

`string`

##### \_\_namedParameters

[`GitDependencies`](GitDependencies.md) = `{}`

#### Returns

`Promise`<`boolean`>

---

### runWorkflow()?

```ts
readonly optional runWorkflow: (options) => Promise<InitWorkflowResult>;
```

Optional: Custom workflow runner function.

#### Parameters

##### options

[`InitWorkflowOptions`](InitWorkflowOptions.md)

#### Returns

`Promise`<[`InitWorkflowResult`](InitWorkflowResult.md)>
