[**@wpkernel/php-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpBuilderChannel

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
