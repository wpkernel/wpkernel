[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityCache

# Type Alias: CapabilityCache

```ts
type CapabilityCache = object;
```

Minimal cache contract used by the capability runtime and React hook.

## Properties

### clear()

```ts
clear: () => void;
```

#### Returns

`void`

---

### get()

```ts
get: (key) => boolean | undefined;
```

#### Parameters

##### key

`string`

#### Returns

`boolean` \| `undefined`

---

### getSnapshot()

```ts
getSnapshot: () => number;
```

#### Returns

`number`

---

### invalidate()

```ts
invalidate: (capabilityKey?) => void;
```

#### Parameters

##### capabilityKey?

`string`

#### Returns

`void`

---

### keys()

```ts
keys: () => string[];
```

#### Returns

`string`[]

---

### set()

```ts
set: (key, value, options?) => void;
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

---

### subscribe()

```ts
subscribe: (listener) => () => void;
```

#### Parameters

##### listener

() => `void`

#### Returns

```ts
(): void;
```

##### Returns

`void`
