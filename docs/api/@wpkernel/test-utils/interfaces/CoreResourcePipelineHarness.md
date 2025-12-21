[**@wpkernel/test-utils v0.12.6-beta.3**](../README.md)

***

[@wpkernel/test-utils](../README.md) / CoreResourcePipelineHarness

# Interface: CoreResourcePipelineHarness&lt;T, TQuery&gt;

A harness for testing resource pipelines.

## Type Parameters

### T

`T`

### TQuery

`TQuery`

## Properties

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter.

***

### pipeline

```ts
readonly pipeline: ResourcePipeline&lt;T, TQuery&gt;;
```

The resource pipeline instance.

***

### reporter

```ts
readonly reporter: MemoryReporter;
```

The memory reporter instance.

***

### resourceName

```ts
readonly resourceName: string;
```

The name of the resource being tested.
