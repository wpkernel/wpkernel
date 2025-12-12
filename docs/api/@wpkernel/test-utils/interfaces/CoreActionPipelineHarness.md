[**@wpkernel/test-utils v0.12.5-beta.0**](../README.md)

***

[@wpkernel/test-utils](../README.md) / CoreActionPipelineHarness

# Interface: CoreActionPipelineHarness&lt;TArgs, TResult&gt;

A harness for testing action pipelines.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter.

***

### pipeline

```ts
readonly pipeline: ActionPipeline&lt;TArgs, TResult&gt;;
```

The action pipeline instance.

***

### reporter

```ts
readonly reporter: MemoryReporter;
```

The memory reporter instance.

***

### teardown()

```ts
teardown: () =&gt; void;
```

A function to clean up the harness.

#### Returns

`void`
