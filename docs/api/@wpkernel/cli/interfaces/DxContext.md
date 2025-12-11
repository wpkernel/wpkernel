[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / DxContext

# Interface: DxContext

Context object threaded through DX readiness helpers.

## Properties

### environment

```ts
readonly environment: DxEnvironment;
```

Environment metadata describing cwd, workspace root, and flags.

---

### reporter

```ts
readonly reporter: Reporter;
```

Reporter used to emit DX readiness diagnostics.

---

### workspace

```ts
readonly workspace: Workspace | null;
```

Current workspace instance if the command resolved one.
