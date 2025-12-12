[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / CapabilityCache

# Type Alias: CapabilityCache

```ts
type CapabilityCache = object;
```

Minimal cache contract used by the capability runtime and React hook.

## Properties

### clear()

```ts
clear: () =&gt; void;
```

#### Returns

`void`

***

### get()

```ts
get: (key) =&gt; boolean | undefined;
```

#### Parameters

##### key

`string`

#### Returns

`boolean` \| `undefined`

***

### getSnapshot()

```ts
getSnapshot: () =&gt; number;
```

#### Returns

`number`

***

### invalidate()

```ts
invalidate: (capabilityKey?) =&gt; void;
```

#### Parameters

##### capabilityKey?

`string`

#### Returns

`void`

***

### keys()

```ts
keys: () =&gt; string[];
```

#### Returns

`string`[]

***

### set()

```ts
set: (key, value, options?) =&gt; void;
```

#### Parameters

##### key

`string`

##### value

`boolean`

##### options?

###### expiresAt?

`number`

###### source?

`"local"` \| `"remote"`

###### ttlMs?

`number`

#### Returns

`void`

***

### subscribe()

```ts
subscribe: (listener) =&gt; () =&gt; void;
```

#### Parameters

##### listener

() =&gt; `void`

#### Returns

```ts
(): void;
```

##### Returns

`void`
