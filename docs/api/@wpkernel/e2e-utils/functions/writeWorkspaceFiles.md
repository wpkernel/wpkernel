[**@wpkernel/e2e-utils v0.12.6-beta.3**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / writeWorkspaceFiles

# Function: writeWorkspaceFiles()

```ts
function writeWorkspaceFiles(workspace, files): Promise<void>;
```

Write a set of files into an isolated workspace tree.

## Parameters

### workspace

[`IsolatedWorkspace`](../interfaces/IsolatedWorkspace.md)

Workspace descriptor returned by [withIsolatedWorkspace](withIsolatedWorkspace.md).

### files

[`WorkspaceFileTree`](../type-aliases/WorkspaceFileTree.md)

Mapping of relative paths to file contents.

## Returns

`Promise`<`void`>
