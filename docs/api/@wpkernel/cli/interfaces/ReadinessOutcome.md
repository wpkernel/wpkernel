[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / ReadinessOutcome

# Interface: ReadinessOutcome<State>

Aggregated outcome for a readiness unit after orchestrator execution.

## Type Parameters

### State

`State` = `unknown`

## Properties

### key

```ts
readonly key: ReadinessKey;
```

---

### status

```ts
readonly status: ReadinessOutcomeStatus;
```

---

### confirmation?

```ts
readonly optional confirmation: ReadinessConfirmation<State>;
```

---

### detection?

```ts
readonly optional detection: ReadinessDetection<State>;
```

---

### error?

```ts
readonly optional error: unknown;
```
