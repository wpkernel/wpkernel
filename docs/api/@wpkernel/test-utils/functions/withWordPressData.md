[**@wpkernel/test-utils v0.12.6-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / withWordPressData

# Function: withWordPressData()

```ts
function withWordPressData<ReturnType>(
	overrides,
	callback
): Promise<ReturnType>;
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

() => `ReturnType` \| `Promise`<`ReturnType`>

The function to execute with the modified global.

## Returns

`Promise`<`ReturnType`>

The return value of the callback.
