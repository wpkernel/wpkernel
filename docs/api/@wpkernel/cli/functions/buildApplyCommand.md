[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / buildApplyCommand

# Function: buildApplyCommand()

```ts
function buildApplyCommand(options): ApplyCommandConstructor;
```

Builds the `apply` command for the CLI.

This command is responsible for applying pending workspace patches generated
by the `generate` command. It handles previewing changes, creating backups,
executing the patch application, and reporting the results.

## Parameters

### options

[`BuildApplyCommandOptions`](../interfaces/BuildApplyCommandOptions.md) = `{}`

Options for building the apply command, including dependencies.

## Returns

[`ApplyCommandConstructor`](../type-aliases/ApplyCommandConstructor.md)

The `ApplyCommandConstructor` class.
