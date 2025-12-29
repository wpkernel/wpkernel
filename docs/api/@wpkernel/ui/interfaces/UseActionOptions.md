[**@wpkernel/ui v0.12.6-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / UseActionOptions

# Interface: UseActionOptions<TInput, TResult>

Options for the useAction hook.

## Type Parameters

### TInput

`TInput`

### TResult

`TResult`

## Properties

### autoInvalidate()?

```ts
optional autoInvalidate: (result, input) => false | CacheKeyPattern[];
```

A function that returns a list of cache key patterns to invalidate on success.

#### Parameters

##### result

`TResult`

The result of the action.

##### input

`TInput`

The input to the action.

#### Returns

`false` \| `CacheKeyPattern`[]

A list of cache key patterns to invalidate, or false to skip invalidation.

---

### concurrency?

```ts
optional concurrency: "parallel" | "switch" | "queue" | "drop";
```

The concurrency strategy to use.

- `parallel` (default): All calls run in parallel.
- `switch`: Cancels all previous calls and runs the new one.
- `queue`: Queues all calls and runs them sequentially.
- `drop`: Drops all new calls while one is running.

---

### dedupeKey()?

```ts
optional dedupeKey: (input) => string;
```

A function that returns a string to use for deduplicating requests.

#### Parameters

##### input

`TInput`

The input to the action.

#### Returns

`string`

A string to use for deduplication.
