[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / DataViewHelper

# Type Alias: DataViewHelper

```ts
type DataViewHelper = object;
```

Convenience helpers for interacting with ResourceDataView in tests.

## Properties

### clearSearch()

```ts
clearSearch: () =&gt; Promise&lt;void&gt;;
```

Clear the search control.

#### Returns

`Promise`&lt;`void`&gt;

***

### getRow()

```ts
getRow: (text) =&gt; Locator;
```

Retrieve a locator for a row containing the provided text.

#### Parameters

##### text

`string`

#### Returns

`Locator`

***

### getSelectedCount()

```ts
getSelectedCount: () =&gt; Promise&lt;number&gt;;
```

Read the bulk selection counter rendered in the footer.

#### Returns

`Promise`&lt;`number`&gt;

***

### getTotalCount()

```ts
getTotalCount: () =&gt; Promise&lt;number&gt;;
```

Read the total item count exposed by the wrapper metadata.

#### Returns

`Promise`&lt;`number`&gt;

***

### root()

```ts
root: () =&gt; Locator;
```

Root locator for the DataView wrapper.

#### Returns

`Locator`

***

### runBulkAction()

```ts
runBulkAction: (label) =&gt; Promise&lt;void&gt;;
```

Trigger a bulk action button by its visible label.

#### Parameters

##### label

`string`

#### Returns

`Promise`&lt;`void`&gt;

***

### search()

```ts
search: (value) =&gt; Promise&lt;void&gt;;
```

Fill the toolbar search control.

#### Parameters

##### value

`string`

#### Returns

`Promise`&lt;`void`&gt;

***

### selectRow()

```ts
selectRow: (text) =&gt; Promise&lt;void&gt;;
```

Toggle selection for a row that matches the provided text.

#### Parameters

##### text

`string`

#### Returns

`Promise`&lt;`void`&gt;

***

### waitForLoaded()

```ts
waitForLoaded: () =&gt; Promise&lt;void&gt;;
```

Wait until the DataView reports that loading has finished.

#### Returns

`Promise`&lt;`void`&gt;
