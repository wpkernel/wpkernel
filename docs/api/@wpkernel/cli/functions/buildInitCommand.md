[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / buildInitCommand

# Function: buildInitCommand()

```ts
function buildInitCommand(options): InitCommandConstructor;
```

Builds the `init` command for the CLI.

This command is responsible for initializing a new WPKernel project by
scaffolding configuration files, entry points, and linting presets.

## Parameters

### options

[`BuildInitCommandOptions`](../interfaces/BuildInitCommandOptions.md) = `{}`

Options for building the init command, including dependencies.

## Returns

[`InitCommandConstructor`](../type-aliases/InitCommandConstructor.md)

The `InitCommandConstructor` class.
