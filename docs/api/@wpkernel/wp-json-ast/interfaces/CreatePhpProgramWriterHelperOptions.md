[**@wpkernel/wp-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / CreatePhpProgramWriterHelperOptions

# Interface: CreatePhpProgramWriterHelperOptions

## Properties

### driver?

```ts
readonly optional driver: PhpDriverConfigurationOptions;
```

***

### emitAst?

```ts
readonly optional emitAst: boolean;
```

When true, emit `&lt;file&gt;.ast.json` and codemod diagnostics to disk.
Defaults to `true` for library usage; callers (e.g., CLI) can disable
this to avoid polluting generated output with debug artifacts.

***

### key?

```ts
readonly optional key: string;
```
