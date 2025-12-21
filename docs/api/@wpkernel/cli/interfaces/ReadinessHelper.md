[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / ReadinessHelper

# Interface: ReadinessHelper&lt;State&gt;

Contract implemented by readiness helpers.

## Type Parameters

### State

`State` = `unknown`

## Properties

### confirm()

```ts
readonly confirm: (context, state) =&gt; Promise&lt;ReadinessConfirmation&lt;State&gt;&gt;;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`&lt;[`ReadinessConfirmation`](ReadinessConfirmation.md)&lt;`State`&gt;&gt;

***

### detect()

```ts
readonly detect: (context) =&gt; Promise&lt;ReadinessDetection&lt;State&gt;&gt;;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

#### Returns

`Promise`&lt;[`ReadinessDetection`](ReadinessDetection.md)&lt;`State`&gt;&gt;

***

### key

```ts
readonly key: ReadinessKey;
```

***

### metadata

```ts
readonly metadata: ReadinessHelperMetadata;
```

***

### execute()?

```ts
readonly optional execute: (context, state) =&gt; Promise&lt;ReadinessStepResult&lt;State&gt;&gt;;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`&lt;[`ReadinessStepResult`](ReadinessStepResult.md)&lt;`State`&gt;&gt;

***

### prepare()?

```ts
readonly optional prepare: (context, state) =&gt; Promise&lt;ReadinessStepResult&lt;State&gt;&gt;;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`&lt;[`ReadinessStepResult`](ReadinessStepResult.md)&lt;`State`&gt;&gt;

***

### rollback()?

```ts
readonly optional rollback: (context, state) =&gt; Promise&lt;void&gt;;
```

#### Parameters

##### context

[`DxContext`](DxContext.md)

##### state

`State`

#### Returns

`Promise`&lt;`void`&gt;
