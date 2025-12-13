[**@wpkernel/e2e-utils v0.12.6-beta.0**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / EventRecorder

# Type Alias: EventRecorder&lt;P&gt;

```ts
type EventRecorder&lt;P&gt; = object;
```

Event utilities for capturing and asserting on wpk events

## Type Parameters

### P

`P` = `unknown`

## Properties

### clear()

```ts
clear: () =&gt; Promise&lt;void&gt;;
```

Clear all captured events

#### Returns

`Promise`&lt;`void`&gt;

***

### find()

```ts
find: (type) =&gt; Promise&lt;CapturedEvent&lt;P&gt; | undefined&gt;;
```

Find first event matching type

#### Parameters

##### type

`string`

Event type to search for

#### Returns

`Promise`&lt;[`CapturedEvent`](CapturedEvent.md)&lt;`P`&gt; \| `undefined`&gt;

First matching event or undefined

***

### findAll()

```ts
findAll: (type) =&gt; Promise&lt;CapturedEvent&lt;P&gt;[]&gt;;
```

Find all events matching type

#### Parameters

##### type

`string`

Event type to search for

#### Returns

`Promise`&lt;[`CapturedEvent`](CapturedEvent.md)&lt;`P`&gt;[]&gt;

Array of matching events

***

### list()

```ts
list: () =&gt; Promise&lt;CapturedEvent&lt;P&gt;[]&gt;;
```

Get all captured events

#### Returns

`Promise`&lt;[`CapturedEvent`](CapturedEvent.md)&lt;`P`&gt;[]&gt;

***

### stop()

```ts
stop: () =&gt; Promise&lt;void&gt;;
```

Stop recording events

#### Returns

`Promise`&lt;`void`&gt;
