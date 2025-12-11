[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / TsBuilderLifecycleHooks

# Interface: TsBuilderLifecycleHooks

Defines lifecycle hooks for the TypeScript builder.

These hooks allow for custom logic to be executed at different stages
of the TypeScript artifact generation process.

## Properties

### onAfterCreate()?

```ts
readonly optional onAfterCreate: (context) =&gt; Promise&lt;void&gt;;
```

Hook executed after a creator generates an artifact.

#### Parameters

##### context

`Omit`&lt;[`TsBuilderCreatorContext`](TsBuilderCreatorContext.md), `"hooks"`&gt;

#### Returns

`Promise`&lt;`void`&gt;

***

### onAfterEmit()?

```ts
readonly optional onAfterEmit: (options) =&gt; Promise&lt;void&gt;;
```

Hook executed after all TypeScript files have been emitted.

#### Parameters

##### options

[`TsBuilderAfterEmitOptions`](TsBuilderAfterEmitOptions.md)

#### Returns

`Promise`&lt;`void`&gt;

***

### onBeforeCreate()?

```ts
readonly optional onBeforeCreate: (context) =&gt; Promise&lt;void&gt;;
```

Hook executed before a creator generates an artifact.

#### Parameters

##### context

`Omit`&lt;[`TsBuilderCreatorContext`](TsBuilderCreatorContext.md), `"hooks"`&gt;

#### Returns

`Promise`&lt;`void`&gt;
