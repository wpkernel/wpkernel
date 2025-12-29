[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / InteractivityModule

# Interface: InteractivityModule

Ambient interface exposed by `@wordpress/interactivity`.

## Extends

- `InteractivityCore`.`Record`<`string`, `unknown`>

## Indexable

```ts
[key: string]: unknown
```

## Properties

### getServerState

```ts
getServerState: InteractivityServerStateResolver;
```

#### Inherited from

```ts
InteractivityCore.getServerState;
```

---

### store()

```ts
store: (namespace, definition?) => InteractivityStoreResult;
```

#### Parameters

##### namespace

`string`

##### definition?

`Record`<`string`, `unknown`>

#### Returns

[`InteractivityStoreResult`](../type-aliases/InteractivityStoreResult.md)

#### Inherited from

```ts
InteractivityCore.store;
```
