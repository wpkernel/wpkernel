[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / requireIr

# Function: requireIr()

```ts
function requireIr<K>(input, keys?): object & Pick<IRv1, K>;
```

Narrowing helper for builders that require the finalized IR.

Usage:

```ts
const { ir, resources, capabilityMap } = requireIr(input, [
	'resources',
	'capabilityMap',
]);
```

Throws a developer-facing error if `input.ir` is null.

## Type Parameters

### K

`K` _extends_ keyof [`IRv1`](../interfaces/IRv1.md)

## Parameters

### input

[`BuilderInput`](../interfaces/BuilderInput.md)

### keys?

readonly `K`[]

## Returns

`object` & `Pick`<[`IRv1`](../interfaces/IRv1.md), `K`>
