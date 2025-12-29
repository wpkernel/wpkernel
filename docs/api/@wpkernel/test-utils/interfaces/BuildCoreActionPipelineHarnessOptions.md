[**@wpkernel/test-utils v0.12.6-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / BuildCoreActionPipelineHarnessOptions

# Interface: BuildCoreActionPipelineHarnessOptions<TArgs, TResult>

Options for building a `CoreActionPipelineHarness`.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### namespace?

```ts
readonly optional namespace: string;
```

The namespace for the reporter.

---

### pipelineFactory()?

```ts
readonly optional pipelineFactory: () => ActionPipeline<TArgs, TResult>;
```

A factory function to create the action pipeline.

#### Returns

`ActionPipeline`<`TArgs`, `TResult`>

---

### runtime?

```ts
readonly optional runtime: RuntimeOverrides;
```

Overrides for the action runtime.
