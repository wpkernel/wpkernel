[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / requireIr

# Function: requireIr()

```ts
function requireIr&lt;K&gt;(input, keys?): object & Pick&lt;IRv1, K&gt;;
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

`K` *extends* keyof [`IRv1`](../interfaces/IRv1.md)

## Parameters

### input

[`BuilderInput`](../interfaces/BuilderInput.md)

### keys?

readonly `K`[]

## Returns

`object` & `Pick`&lt;[`IRv1`](../interfaces/IRv1.md), `K`&gt;
