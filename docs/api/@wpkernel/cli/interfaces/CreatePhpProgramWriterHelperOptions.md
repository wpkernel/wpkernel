[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / CreatePhpProgramWriterHelperOptions

# Interface: CreatePhpProgramWriterHelperOptions

## Properties

### driver?

```ts
readonly optional driver: PhpDriverConfigurationOptions;
```

---

### emitAst?

```ts
readonly optional emitAst: boolean;
```

When true, emit `<file>.ast.json` and codemod diagnostics to disk.
Defaults to `true` for library usage; callers (e.g., CLI) can disable
this to avoid polluting generated output with debug artifacts.

---

### key?

```ts
readonly optional key: string;
```
