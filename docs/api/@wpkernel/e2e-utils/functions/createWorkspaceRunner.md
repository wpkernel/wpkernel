[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / createWorkspaceRunner

# Function: createWorkspaceRunner()

```ts
function createWorkspaceRunner(
	defaultOptions
): (run, overrides?) => Promise<void>;
```

Creates a workspace runner function with default options.

## Parameters

### defaultOptions

`WorkspaceOptions` = `{}`

Default options to apply to all workspaces created by the runner.

## Returns

A function that takes a test function and optional overrides, and runs it within a workspace.

```ts
(run, overrides?): Promise<void>;
```

### Parameters

#### run

(`workspace`) => `Promise`<`void`>

#### overrides?

`WorkspaceOptions`

### Returns

`Promise`<`void`>
