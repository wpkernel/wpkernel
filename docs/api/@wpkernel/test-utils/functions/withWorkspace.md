[**@wpkernel/test-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/test-utils](../README.md) / withWorkspace

# Function: withWorkspace()

```ts
function withWorkspace(run, options): Promise<void>;
```

Creates and manages a temporary workspace for integration tests.

## Parameters

### run

(`workspace`) => `Promise`<`void`>

The test function to execute within the workspace. It receives the workspace path as an argument.

### options

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md) = `{}`

Configuration options for the workspace.

## Returns

`Promise`<`void`>

A Promise that resolves when the test and cleanup are complete.
