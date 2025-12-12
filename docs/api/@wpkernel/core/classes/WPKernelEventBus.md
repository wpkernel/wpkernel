[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / WPKernelEventBus

# Class: WPKernelEventBus

Typed event bus used across WPKernel to broadcast lifecycle events and
cache invalidation notices.

The bus automatically resolves a reporter so listener failures can be logged
during development while remaining silent in production or when reporters are
muted.

## Constructors

### Constructor

```ts
new WPKernelEventBus(): WPKernelEventBus;
```

#### Returns

`WPKernelEventBus`

## Methods

### emit()

```ts
emit&lt;K&gt;(event, payload): void;
```

Emit the specified event and execute every registered listener. Any
listener failures are reported via the resolved reporter when running
outside of production.

#### Type Parameters

##### K

`K` *extends* keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### payload

[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]

#### Returns

`void`

***

### off()

```ts
off&lt;K&gt;(event, listener): void;
```

Remove a previously registered listener. Calling this method for a
listener that was never registered is a no-op.

#### Type Parameters

##### K

`K` *extends* keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

[`Listener`](../type-aliases/Listener.md)&lt;[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]&gt;

#### Returns

`void`

***

### on()

```ts
on&lt;K&gt;(event, listener): () =&gt; void;
```

Register a listener that remains active until the returned teardown
function is called.

#### Type Parameters

##### K

`K` *extends* keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

[`Listener`](../type-aliases/Listener.md)&lt;[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]&gt;

#### Returns

```ts
(): void;
```

##### Returns

`void`

***

### once()

```ts
once&lt;K&gt;(event, listener): () =&gt; void;
```

Register a listener that runs only once for the next occurrence of
the event and then tears itself down.

#### Type Parameters

##### K

`K` *extends* keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

[`Listener`](../type-aliases/Listener.md)&lt;[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]&gt;

#### Returns

```ts
(): void;
```

##### Returns

`void`
