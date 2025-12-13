[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / InteractionActionBinding

# Interface: InteractionActionBinding<TArgs, TResult>

Declarative binding describing an action exposed to the runtime.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### action

```ts
readonly action: DefinedAction<TArgs, TResult>;
```

---

### meta?

```ts
readonly optional meta:
  | Record<string, unknown>
| InteractionActionMetaResolver<TArgs>;
```
