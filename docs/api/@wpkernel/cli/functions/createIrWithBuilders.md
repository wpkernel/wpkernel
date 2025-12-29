[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / createIrWithBuilders

# Function: createIrWithBuilders()

```ts
function createIrWithBuilders(options, environment): Promise & lt;
IRv1 & gt;
```

Runs the full generation pipeline (IR + builders) from the given build options.

This function sets up a pipeline with core IR fragments and all core builders,
then executes it to both construct the IR and generate artefacts (PHP, TS, UI
entries, bundles, etc.) as a side-effect. It represents the high-level
"generate everything" entry point used by the CLI.

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
