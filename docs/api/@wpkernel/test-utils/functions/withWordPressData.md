[**@wpkernel/test-utils v0.12.3-beta.2**](../README.md)

***

[@wpkernel/test-utils](../README.md) / withWordPressData

# Function: withWordPressData()

```ts
function withWordPressData&lt;ReturnType&gt;(overrides, callback): Promise&lt;ReturnType&gt;;
```

Executes a callback with a modified `window.wp` global, restoring the original afterwards.

## Type Parameters

### ReturnType

`ReturnType`

## Parameters

### overrides

[`WithWordPressDataOptions`](../interfaces/WithWordPressDataOptions.md)

Options to temporarily override parts of the `window.wp` global.

### callback

() =&gt; `ReturnType` \| `Promise`&lt;`ReturnType`&gt;

The function to execute with the modified global.

## Returns

`Promise`&lt;`ReturnType`&gt;

The return value of the callback.
