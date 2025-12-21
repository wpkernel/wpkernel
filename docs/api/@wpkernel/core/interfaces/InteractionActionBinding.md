[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / InteractionActionBinding

# Interface: InteractionActionBinding&lt;TArgs, TResult&gt;

Declarative binding describing an action exposed to the runtime.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### action

```ts
readonly action: DefinedAction&lt;TArgs, TResult&gt;;
```

***

### meta?

```ts
readonly optional meta: 
  | Record&lt;string, unknown&gt;
| InteractionActionMetaResolver&lt;TArgs&gt;;
```
