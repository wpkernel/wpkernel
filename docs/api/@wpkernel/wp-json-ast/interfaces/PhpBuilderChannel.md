[**@wpkernel/wp-json-ast v0.12.4-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / PhpBuilderChannel

# Interface: PhpBuilderChannel

## Properties

### drain()

```ts
drain: () =&gt; readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]

***

### pending()

```ts
pending: () =&gt; readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]

***

### queue()

```ts
queue: (action) =&gt; void;
```

#### Parameters

##### action

[`PhpProgramAction`](PhpProgramAction.md)

#### Returns

`void`

***

### reset()

```ts
reset: () =&gt; void;
```

#### Returns

`void`
