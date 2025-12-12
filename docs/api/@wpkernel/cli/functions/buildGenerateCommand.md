[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / buildGenerateCommand

# Function: buildGenerateCommand()

```ts
function buildGenerateCommand(options): CommandConstructor;
```

Builds the `generate` command for the CLI.

This command is responsible for generating WPKernel artifacts (PHP, TypeScript)
from the `wpk.config.*` configuration files. It processes the configuration,
builds an Intermediate Representation (IR), and uses various builders to
produce the final generated code.

## Parameters

### options

[`BuildGenerateCommandOptions`](../interfaces/BuildGenerateCommandOptions.md) = `{}`

Options for building the generate command, including dependencies.

## Returns

[`CommandConstructor`](../type-aliases/CommandConstructor.md)

The `CommandConstructor` class for the generate command.
