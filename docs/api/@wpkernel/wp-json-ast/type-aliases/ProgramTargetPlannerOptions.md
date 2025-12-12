[**@wpkernel/wp-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ProgramTargetPlannerOptions

# Type Alias: ProgramTargetPlannerOptions<TFile>

```ts
type ProgramTargetPlannerOptions<TFile> = object;
```

## Type Parameters

### TFile

`TFile` _extends_ [`ProgramTargetFile`](../interfaces/ProgramTargetFile.md) = [`ProgramTargetFile`](../interfaces/ProgramTargetFile.md)

## Properties

### channel

```ts
readonly channel: PhpBuilderChannel;
```

---

### outputDir

```ts
readonly outputDir: string;
```

---

### workspace

```ts
readonly workspace: PipelineContext["workspace"];
```

---

### docblockPrefix?

```ts
readonly optional docblockPrefix: readonly string[];
```

---

### strategy?

```ts
readonly optional strategy: ProgramTargetPlannerStrategy<TFile>;
```
