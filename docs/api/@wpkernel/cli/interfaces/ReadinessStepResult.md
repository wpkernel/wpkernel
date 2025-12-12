[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / ReadinessStepResult

# Interface: ReadinessStepResult<State>

Shared shape for prepare and execute phase results.

## Type Parameters

### State

`State`

## Properties

### state

```ts
readonly state: State;
```

---

### cleanup()?

```ts
readonly optional cleanup: () => void | Promise<void>;
```

#### Returns

`void` \| `Promise`<`void`>
