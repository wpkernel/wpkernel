[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / DxEnvironment

# Interface: DxEnvironment

Environment metadata shared with readiness helpers.

## Properties

### allowDirty

```ts
readonly allowDirty: boolean;
```

When true, readiness helpers should tolerate dirty workspaces. This
is controlled by the shared `--allow-dirty` flag.

---

### cwd

```ts
readonly cwd: string;
```

Directory where the CLI process was invoked.

---

### projectRoot

```ts
readonly projectRoot: string;
```

Absolute path to the CLI package root.

---

### workspaceRoot

```ts
readonly workspaceRoot: string | null;
```

Resolved workspace root for the current command. `null` when the
command operates outside of a project workspace (for example, prior
to scaffolding).
