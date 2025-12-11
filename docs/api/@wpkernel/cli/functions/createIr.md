[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / createIr

# Function: createIr()

```ts
function createIr(options, environment): Promise & lt;
IRv1 & gt;
```

Builds the Intermediate Representation (IR) by running only the core IR fragments.

This variant does not register or execute any builders. It is intended for
scenarios where you want a deterministic IR to assert against (e.g. tests
or analysis tooling) without generating any artefacts on disk.

## Parameters

### options

[`FragmentIrOptions`](../interfaces/FragmentIrOptions.md)

Options for building the IR, including configuration and source paths.

### environment

[`CreateIrEnvironment`](../interfaces/CreateIrEnvironment.md) = `{}`

Optional environment settings for the IR creation process.

## Returns

`Promise`<[`IRv1`](../interfaces/IRv1.md)>

A promise that resolves to the generated `IRv1` object.
