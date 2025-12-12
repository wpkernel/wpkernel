[**@wpkernel/test-utils v0.12.4-beta.0**](../README.md)

***

[@wpkernel/test-utils](../README.md) / BuildCoreResourcePipelineHarnessOptions

# Interface: BuildCoreResourcePipelineHarnessOptions&lt;T, TQuery&gt;

Options for building a `CoreResourcePipelineHarness`.

## Type Parameters

### T

`T`

### TQuery

`TQuery`

## Properties

### namespace?

```ts
readonly optional namespace: string;
```

The namespace for the reporter.

***

### pipelineFactory()?

```ts
readonly optional pipelineFactory: () =&gt; ResourcePipeline&lt;T, TQuery&gt;;
```

A factory function to create the resource pipeline.

#### Returns

`ResourcePipeline`&lt;`T`, `TQuery`&gt;

***

### resourceName?

```ts
readonly optional resourceName: string;
```

The name of the resource.
