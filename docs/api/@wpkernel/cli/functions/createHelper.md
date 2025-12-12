[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / createHelper

# Function: createHelper()

Creates a generic helper function for pipeline steps (fragments or builders).

This function provides a standardized way to define pipeline steps with a key,
kind, and an `apply` method, along with optional dependencies.

## Param

Options for creating the helper, including key, kind, and apply logic.

## Call Signature

```ts
function createHelper(options): FragmentHelper;
```

Creates a pipeline helper for use within the CLI's code generation pipeline.

This function acts as a wrapper around the core `createHelper` from `@wpkernel/core/pipeline`,
providing type-safe definitions for CLI-specific fragment and builder helpers.
Helpers are reusable units of logic that can transform input into output within the pipeline.

### Parameters

#### options

`FragmentHelperOptions`

Configuration options for the helper, including its kind, handler, and metadata.

### Returns

[`FragmentHelper`](../type-aliases/FragmentHelper.md)

A `FragmentHelper` or `BuilderHelper` instance, depending on the provided options.

## Call Signature

```ts
function createHelper(options): BuilderHelper;
```

Creates a pipeline helper for use within the CLI's code generation pipeline.

This function acts as a wrapper around the core `createHelper` from `@wpkernel/core/pipeline`,
providing type-safe definitions for CLI-specific fragment and builder helpers.
Helpers are reusable units of logic that can transform input into output within the pipeline.

### Parameters

#### options

`BuilderHelperOptions`

Configuration options for the helper, including its kind, handler, and metadata.

### Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `FragmentHelper` or `BuilderHelper` instance, depending on the provided options.
