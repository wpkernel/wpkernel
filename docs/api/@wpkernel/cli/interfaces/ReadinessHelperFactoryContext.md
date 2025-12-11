[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / ReadinessHelperFactoryContext

# Interface: ReadinessHelperFactoryContext

## Properties

### createHelper()

```ts
readonly createHelper: &lt;State&gt;(helper) =&gt; ReadinessHelper&lt;State&gt;;
```

Creates an immutable readiness helper definition.

#### Type Parameters

##### State

`State`

#### Parameters

##### helper

[`ReadinessHelper`](ReadinessHelper.md)&lt;`State`&gt;

#### Returns

[`ReadinessHelper`](ReadinessHelper.md)&lt;`State`&gt;

***

### register()

```ts
readonly register: (helper) =&gt; void;
```

#### Parameters

##### helper

[`ReadinessHelper`](ReadinessHelper.md)

#### Returns

`void`

***

### registry

```ts
readonly registry: ReadinessRegistry;
```
