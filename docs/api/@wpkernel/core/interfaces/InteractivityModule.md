[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / InteractivityModule

# Interface: InteractivityModule

Ambient interface exposed by `@wordpress/interactivity`.

## Extends

- `InteractivityCore`.`Record`&lt;`string`, `unknown`&gt;

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
InteractivityCore.getServerState
```

***

### store()

```ts
store: (namespace, definition?) =&gt; InteractivityStoreResult;
```

#### Parameters

##### namespace

`string`

##### definition?

`Record`&lt;`string`, `unknown`&gt;

#### Returns

[`InteractivityStoreResult`](../type-aliases/InteractivityStoreResult.md)

#### Inherited from

```ts
InteractivityCore.store
```
