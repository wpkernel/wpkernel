[**@wpkernel/ui v0.12.5-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / UseActionResult

# Interface: UseActionResult<TInput, TResult>

The result of the useAction hook.

## Extends

- `UseActionState`<`TResult`>

## Type Parameters

### TInput

`TInput`

### TResult

`TResult`

## Properties

### cancel()

```ts
cancel: () => void;
```

A function to cancel all in-flight requests.

#### Returns

`void`

---

### inFlight

```ts
inFlight: number;
```

The number of in-flight requests.

#### Inherited from

```ts
UseActionState.inFlight;
```

---

### reset()

```ts
reset: () => void;
```

A function to reset the state of the hook.

#### Returns

`void`

---

### run()

```ts
run: (input) => Promise<TResult>;
```

A function to run the action.

#### Parameters

##### input

`TInput`

The input to the action.

#### Returns

`Promise`<`TResult`>

A promise that resolves with the result of the action.

---

### status

```ts
status: 'idle' | 'running' | 'success' | 'error';
```

The status of the action.

#### Inherited from

```ts
UseActionState.status;
```

---

### error?

```ts
optional error: WPKernelError;
```

The error, if the action failed.

#### Inherited from

```ts
UseActionState.error;
```

---

### result?

```ts
optional result: TResult;
```

The result of the action.

#### Inherited from

```ts
UseActionState.result;
```
