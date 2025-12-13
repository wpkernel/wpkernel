[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ParamsOf

# Type Alias: ParamsOf<K, Key>

```ts
type ParamsOf<K, Key> = K[Key] extends void ? [] : [K[Key]];
```

Extract the tuple type used for params in `can`/`assert` helpers.
Ensures that void params are optional while others remain required.

## Type Parameters

### K

`K`

### Key

`Key` _extends_ keyof `K`
