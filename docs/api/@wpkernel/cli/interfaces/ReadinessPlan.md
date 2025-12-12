[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / ReadinessPlan

# Interface: ReadinessPlan

Planner returned from the readiness registry when orchestrating units.

## Properties

### keys

```ts
readonly keys: readonly ReadinessKey[];
```

***

### run()

```ts
readonly run: (context) =&gt; Promise&lt;ReadinessRunResult&gt;;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

#### Returns

`Promise`&lt;[`ReadinessRunResult`](ReadinessRunResult.md)&gt;
