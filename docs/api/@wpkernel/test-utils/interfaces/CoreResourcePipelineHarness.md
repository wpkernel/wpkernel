[**@wpkernel/test-utils v0.12.5-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / CoreResourcePipelineHarness

# Interface: CoreResourcePipelineHarness<T, TQuery>

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

---

### pipeline

```ts
readonly pipeline: ResourcePipeline<T, TQuery>;
```

The resource pipeline instance.

---

### reporter

```ts
readonly reporter: MemoryReporter;
```

The memory reporter instance.

---

### resourceName

```ts
readonly resourceName: string;
```

The name of the resource being tested.
