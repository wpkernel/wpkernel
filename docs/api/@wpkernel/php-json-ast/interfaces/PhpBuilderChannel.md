[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpBuilderChannel

# Interface: PhpBuilderChannel

## Properties

### drain()

```ts
drain: () => readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]

---

### pending()

```ts
pending: () => readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]

---

### queue()

```ts
queue: (action) => void;
```

#### Parameters

##### action

[`PhpProgramAction`](PhpProgramAction.md)

#### Returns

`void`

---

### reset()

```ts
reset: () => void;
```

#### Returns

`void`
