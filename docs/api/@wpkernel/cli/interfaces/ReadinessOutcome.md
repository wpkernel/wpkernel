[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / ReadinessOutcome

# Interface: ReadinessOutcome&lt;State&gt;

Aggregated outcome for a readiness unit after orchestrator execution.

## Type Parameters

### State

`State` = `unknown`

## Properties

### key

```ts
readonly key: ReadinessKey;
```

***

### status

```ts
readonly status: ReadinessOutcomeStatus;
```

***

### confirmation?

```ts
readonly optional confirmation: ReadinessConfirmation&lt;State&gt;;
```

***

### detection?

```ts
readonly optional detection: ReadinessDetection&lt;State&gt;;
```

***

### error?

```ts
readonly optional error: unknown;
```
