[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ActionConfig

# Type Alias: ActionConfig&lt;TArgs, TResult&gt;

```ts
type ActionConfig&lt;TArgs, TResult&gt; = object;
```

Configuration object accepted by `defineAction()`.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### handler

```ts
handler: ActionFn&lt;TArgs, TResult&gt;;
```

Implementation invoked when the action is executed.

***

### name

```ts
name: string;
```

Unique action identifier.

***

### options?

```ts
optional options: ActionOptions;
```

Optional runtime configuration.
