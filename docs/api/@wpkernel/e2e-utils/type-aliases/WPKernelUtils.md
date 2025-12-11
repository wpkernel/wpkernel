[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / WPKernelUtils

# Type Alias: WPKernelUtils

```ts
type WPKernelUtils = object;
```

Main wpk utilities object returned by factory

## Properties

### dataview()

```ts
dataview: (options) => DataViewHelper;
```

Interact with a DataView rendered via ResourceDataView.

#### Parameters

##### options

[`DataViewHelperOptions`](DataViewHelperOptions.md)

Selection options for the DataView wrapper.

#### Returns

[`DataViewHelper`](DataViewHelper.md)

---

### events()

```ts
events: <P>(options?) => Promise<EventRecorder<P>>;
```

Create event recorder for capturing wpk events

#### Type Parameters

##### P

`P` = `unknown`

#### Parameters

##### options?

[`EventRecorderOptions`](EventRecorderOptions.md)

Optional configuration for event filtering

#### Returns

`Promise`<[`EventRecorder`](EventRecorder.md)<`P`>>

Event recorder with capture and query methods

---

### resource()

```ts
resource: <T>(config) => ResourceUtils<T>;
```

Create resource utilities for a given resource config

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### config

[`WPKernelResourceConfig`](WPKernelResourceConfig.md)

Resource configuration from defineResource

#### Returns

[`ResourceUtils`](ResourceUtils.md)<`T`>

Resource utilities with typed methods

---

### store()

```ts
store: <T>(storeKey) => StoreUtils<T>;
```

Create store utilities for a given store key

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### storeKey

`string`

WordPress data store key (e.g., 'wpk/job')

#### Returns

[`StoreUtils`](StoreUtils.md)<`T`>

Store utilities with typed methods
