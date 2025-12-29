[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / toWorkspaceRelative

# Function: toWorkspaceRelative()

```ts
function toWorkspaceRelative(workspace, targetPath): string;
```

Converts a target path to a workspace-relative POSIX path when possible.

- `workspace` may be a Workspace-like object with a `root` property
  or a string root path.
- `targetPath` may be absolute or relative; relative paths are resolved
  against the workspace root.
- If the resolved path is inside the workspace, a relative POSIX path
  is returned ('.' for the root).
- If the resolved path is outside the workspace, the absolute path is
  returned, normalised to POSIX separators.

## Parameters

### workspace

`WorkspaceLike`

### targetPath

`string`

## Returns

`string`
