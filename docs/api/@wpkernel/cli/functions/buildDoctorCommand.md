[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / buildDoctorCommand

# Function: buildDoctorCommand()

```ts
function buildDoctorCommand(options): () =&gt; Command;
```

Builds the `doctor` command for the CLI.

This command runs various health checks for the WPKernel project,
including configuration, bundled assets, PHP tooling, and workspace hygiene.

## Parameters

### options

[`BuildDoctorCommandOptions`](../interfaces/BuildDoctorCommandOptions.md) = `{}`

Options for building the doctor command, including dependencies.

## Returns

The `Command` class for the doctor command.

```ts
new buildDoctorCommand(): Command;
```

### Returns

`Command`
