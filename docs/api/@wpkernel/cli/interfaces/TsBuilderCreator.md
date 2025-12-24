[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

***

[@wpkernel/cli](../README.md) / TsBuilderCreator

# Interface: TsBuilderCreator

Defines a creator function for generating TypeScript artifacts.

A creator is responsible for generating specific TypeScript files or code
based on the provided context.

## Properties

### create()

```ts
create: (context) =&gt; Promise&lt;void&gt;;
```

The function that creates the TypeScript artifact.

#### Parameters

##### context

[`TsBuilderCreatorContext`](TsBuilderCreatorContext.md)

#### Returns

`Promise`&lt;`void`&gt;

***

### key

```ts
readonly key: string;
```

A unique key for the creator.
