[**@wpkernel/test-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/test-utils](../README.md) / CoreActionPipelineHarness

# Interface: CoreActionPipelineHarness<TArgs, TResult>

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

---

### pipeline

```ts
readonly pipeline: ActionPipeline<TArgs, TResult>;
```

The action pipeline instance.

---

### reporter

```ts
readonly reporter: MemoryReporter;
```

The memory reporter instance.

---

### teardown()

```ts
teardown: () => void;
```

A function to clean up the harness.

#### Returns

`void`
