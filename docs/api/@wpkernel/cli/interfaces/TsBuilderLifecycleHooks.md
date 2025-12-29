[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / TsBuilderLifecycleHooks

# Interface: TsBuilderLifecycleHooks

Defines lifecycle hooks for the TypeScript builder.

These hooks allow for custom logic to be executed at different stages
of the TypeScript artifact generation process.

## Properties

### onAfterCreate()?

```ts
readonly optional onAfterCreate: (context) => Promise<void>;
```

Hook executed after a creator generates an artifact.

#### Parameters

##### context

`Omit`<[`TsBuilderCreatorContext`](TsBuilderCreatorContext.md), `"hooks"`>

#### Returns

`Promise`<`void`>

---

### onAfterEmit()?

```ts
readonly optional onAfterEmit: (options) => Promise<void>;
```

Hook executed after all TypeScript files have been emitted.

#### Parameters

##### options

[`TsBuilderAfterEmitOptions`](TsBuilderAfterEmitOptions.md)

#### Returns

`Promise`<`void`>

---

### onBeforeCreate()?

```ts
readonly optional onBeforeCreate: (context) => Promise<void>;
```

Hook executed before a creator generates an artifact.

#### Parameters

##### context

`Omit`<[`TsBuilderCreatorContext`](TsBuilderCreatorContext.md), `"hooks"`>

#### Returns

`Promise`<`void`>
