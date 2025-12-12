[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / buildCreateCommand

# Function: buildCreateCommand()

```ts
function buildCreateCommand(options): CreateCommandConstructor;
```

Builds the `create` command for the CLI.

This command is responsible for creating a new WPKernel project, including
scaffolding files, initializing a Git repository, and installing dependencies.

## Parameters

### options

[`BuildCreateCommandOptions`](../interfaces/BuildCreateCommandOptions.md) = `{}`

Options for building the create command, including dependencies.

## Returns

[`CreateCommandConstructor`](../type-aliases/CreateCommandConstructor.md)

The `CreateCommandConstructor` class.
