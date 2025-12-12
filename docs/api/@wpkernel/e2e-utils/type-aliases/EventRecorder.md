[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / EventRecorder

# Type Alias: EventRecorder<P>

```ts
type EventRecorder<P> = object;
```

Event utilities for capturing and asserting on wpk events

## Type Parameters

### P

`P` = `unknown`

## Properties

### clear()

```ts
clear: () => Promise<void>;
```

Clear all captured events

#### Returns

`Promise`<`void`>

---

### find()

```ts
find: (type) => Promise<CapturedEvent<P> | undefined>;
```

Find first event matching type

#### Parameters

##### type

`string`

Event type to search for

#### Returns

`Promise`<[`CapturedEvent`](CapturedEvent.md)<`P`> \| `undefined`>

First matching event or undefined

---

### findAll()

```ts
findAll: (type) => Promise<CapturedEvent<P>[]>;
```

Find all events matching type

#### Parameters

##### type

`string`

Event type to search for

#### Returns

`Promise`<[`CapturedEvent`](CapturedEvent.md)<`P`>[]>

Array of matching events

---

### list()

```ts
list: () => Promise<CapturedEvent<P>[]>;
```

Get all captured events

#### Returns

`Promise`<[`CapturedEvent`](CapturedEvent.md)<`P`>[]>

---

### stop()

```ts
stop: () => Promise<void>;
```

Stop recording events

#### Returns

`Promise`<`void`>
