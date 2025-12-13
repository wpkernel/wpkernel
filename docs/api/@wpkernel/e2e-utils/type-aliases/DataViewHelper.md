[**@wpkernel/e2e-utils v0.12.5-beta.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / DataViewHelper

# Type Alias: DataViewHelper

```ts
type DataViewHelper = object;
```

Convenience helpers for interacting with ResourceDataView in tests.

## Properties

### clearSearch()

```ts
clearSearch: () => Promise<void>;
```

Clear the search control.

#### Returns

`Promise`<`void`>

---

### getRow()

```ts
getRow: (text) => Locator;
```

Retrieve a locator for a row containing the provided text.

#### Parameters

##### text

`string`

#### Returns

`Locator`

---

### getSelectedCount()

```ts
getSelectedCount: () => Promise<number>;
```

Read the bulk selection counter rendered in the footer.

#### Returns

`Promise`<`number`>

---

### getTotalCount()

```ts
getTotalCount: () => Promise<number>;
```

Read the total item count exposed by the wrapper metadata.

#### Returns

`Promise`<`number`>

---

### root()

```ts
root: () => Locator;
```

Root locator for the DataView wrapper.

#### Returns

`Locator`

---

### runBulkAction()

```ts
runBulkAction: (label) => Promise<void>;
```

Trigger a bulk action button by its visible label.

#### Parameters

##### label

`string`

#### Returns

`Promise`<`void`>

---

### search()

```ts
search: (value) => Promise<void>;
```

Fill the toolbar search control.

#### Parameters

##### value

`string`

#### Returns

`Promise`<`void`>

---

### selectRow()

```ts
selectRow: (text) => Promise<void>;
```

Toggle selection for a row that matches the provided text.

#### Parameters

##### text

`string`

#### Returns

`Promise`<`void`>

---

### waitForLoaded()

```ts
waitForLoaded: () => Promise<void>;
```

Wait until the DataView reports that loading has finished.

#### Returns

`Promise`<`void`>
