[**@wpkernel/core v0.12.6-beta.3**](../README.md)

***

[@wpkernel/core](../README.md) / Reporter

# Type Alias: Reporter

```ts
type Reporter = object;
```

## Properties

### child()

```ts
child: (namespace) =&gt; Reporter;
```

#### Parameters

##### namespace

`string`

#### Returns

`Reporter`

***

### debug()

```ts
debug: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`

***

### error()

```ts
error: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`

***

### info()

```ts
info: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`

***

### warn()

```ts
warn: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`
