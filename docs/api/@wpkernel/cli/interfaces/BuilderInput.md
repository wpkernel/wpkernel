[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / BuilderInput

# Interface: BuilderInput

Input for a builder helper.

## Extends

- `Omit`&lt;`BaseBuilderInput`, `"options"` \| `"ir"`&gt;

## Properties

### ir

```ts
readonly ir: IRv1 | null;
```

The finalized Intermediate Representation (IR).

***

### options

```ts
readonly options: BuilderOptions;
```

Options for builder execution (no raw config).

***

### phase

```ts
readonly phase: PipelinePhase;
```

#### Inherited from

```ts
Omit.phase
```
