[**@wpkernel/test-utils v0.12.3-beta.1**](../README.md)

***

[@wpkernel/test-utils](../README.md) / withWorkspace

# Function: withWorkspace()

```ts
function withWorkspace(run, options): Promise&lt;void&gt;;
```

Creates and manages a temporary workspace for integration tests.

## Parameters

### run

(`workspace`) =&gt; `Promise`&lt;`void`&gt;

The test function to execute within the workspace. It receives the workspace path as an argument.

### options

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md) = `{}`

Configuration options for the workspace.

## Returns

`Promise`&lt;`void`&gt;

A Promise that resolves when the test and cleanup are complete.
