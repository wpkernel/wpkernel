[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / TsBuilderAfterEmitOptions

# Interface: TsBuilderAfterEmitOptions

Options passed to the `onAfterEmit` lifecycle hook.

## Properties

### emitted

```ts
readonly emitted: readonly string[];
```

A list of file paths that were emitted.

---

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance.

---

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.
