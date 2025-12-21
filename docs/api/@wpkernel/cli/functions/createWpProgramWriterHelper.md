[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / createWpProgramWriterHelper

# Function: createWpProgramWriterHelper()

```ts
function createWpProgramWriterHelper(options): BuilderHelper;
```

Creates a PHP builder helper for writing PHP program files to the filesystem.

This helper takes the generated PHP program representations from the channel
and writes them to the appropriate output directory, using the configured
PHP driver for formatting and pretty-printing.

## Parameters

### options

[`CreatePhpProgramWriterHelperOptions`](../interfaces/CreatePhpProgramWriterHelperOptions.md) = `{}`

Options for configuring the PHP program writer.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for writing PHP program files.
