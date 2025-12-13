[**@wpkernel/test-utils v0.12.6-beta.0**](../README.md)

***

[@wpkernel/test-utils](../README.md) / BuildCoreActionPipelineHarnessOptions

# Interface: BuildCoreActionPipelineHarnessOptions&lt;TArgs, TResult&gt;

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

***

### pipelineFactory()?

```ts
readonly optional pipelineFactory: () =&gt; ActionPipeline&lt;TArgs, TResult&gt;;
```

A factory function to create the action pipeline.

#### Returns

`ActionPipeline`&lt;`TArgs`, `TResult`&gt;

***

### runtime?

```ts
readonly optional runtime: RuntimeOverrides;
```

Overrides for the action runtime.
