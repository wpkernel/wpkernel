[**@wpkernel/wp-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ProgramTargetPlannerStrategy

# Type Alias: ProgramTargetPlannerStrategy<TFile>

```ts
type ProgramTargetPlannerStrategy<TFile> = object;
```

## Type Parameters

### TFile

`TFile` _extends_ [`ProgramTargetFile`](../interfaces/ProgramTargetFile.md) = [`ProgramTargetFile`](../interfaces/ProgramTargetFile.md)

## Properties

### resolveFilePath()?

```ts
readonly optional resolveFilePath: (context) => string;
```

#### Parameters

##### context

[`ResolveFilePathStrategyContext`](../interfaces/ResolveFilePathStrategyContext.md)<`TFile`>

#### Returns

`string`
