[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / buildStartCommand

# Function: buildStartCommand()

```ts
function buildStartCommand(options): () => Command;
```

Builds the `start` command for the CLI.

This command initiates a watch mode for wpk sources, regenerating artifacts
on changes and running a Vite development server. It supports debouncing
changes and optionally auto-applying generated PHP artifacts.

## Parameters

### options

[`BuildStartCommandOptions`](../interfaces/BuildStartCommandOptions.md) = `{}`

Options for building the start command, including dependencies.

## Returns

The `Command` class for the start command.

```ts
new buildStartCommand(): Command;
```

### Returns

`Command`
